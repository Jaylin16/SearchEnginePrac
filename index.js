const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs"); //node에서 제공.
const initUrl = "https://en.wikipedia.org/wiki/Main_Page";

// 무한루프 함수 생성.
// 1. 특정 사이트에 방문
// 2. 그 사이트에서 HTML 문서를 파싱 (cheerio 사용)
// 3. 우리가 원하는 데이터만 추출 -> DB 저장 (DB가 없는 상태에서 fs 파일 저장)
// 4. 다음 방문할 사이트 목록 획득 -> 참조된 사이트들은 페이지 랭크 점수 획득
// 5. 1번으로 돌아가 반복

//저장 원하는 데이터 형태
let dbList = {};
let queue = [];
let progressIndex = 0;

const crawl = async (url) => {
  console.log("방문한 URL: ", url);

  try {
    var htmlDoc = await axios.get(url);
  } catch (error) {
    await startNextQueue();
    return;
  }

  if (!htmlDoc.data) {
    console.log("HTML 문서가 없습니다.");
    await startNextQueue();
    return;
  }

  const $ = cheerio.load(htmlDoc.data); //여기서 $에 html 문서를 넣는 것은 일종의 컨벤션.
  const links = $("a");
  const title = $("h1").text();

  if (dbList[url]) {
    dbList[url].score += 1;
  } else {
    dbList[url] = {
      title,
      score: 1,
    };
  }

  links.each((index, element) => {
    const href = $(element).attr("href");

    if (!href) return;

    if (href.startsWith("http://") || href.startsWith("https://")) {
      checkAlreadyVisited(href);

      return;
    }

    const originUrl = new URL(url).origin;
    const newUrl = originUrl + href;
    queue.push(newUrl);
  });

  if (queue[progressIndex]) {
    await startNextQueue();
  } else {
    console.log("크롤링 종료");
    console.log(dbList);
  }
};

const startNextQueue = async () => {
  await timeout();

  crawl(queue[progressIndex]);
  progressIndex += 1;

  if (progressIndex % 10 === 0) {
    storeDb();
  }
};

const checkAlreadyVisited = (href) => {
  if (!dbList[href]) {
    queue.push(href);
  }
};

const timeout = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
};

const storeDb = () => {
  const json = JSON.stringify(dbList);
  fs.writeFileSync("./db.json", json);
};

crawl(initUrl);
