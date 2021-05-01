const fs = require("fs");
const axios = require("axios");
const Path = require("path");
const puppeteer = require("puppeteer");

function readLinkFromTxt() {
  try {
    let data = fs.readFileSync("links.txt", "utf-8");
    let linksArray = data.split(/\r?\n/);
    return linksArray;
  } catch (e) {
    console.log("Error:", e.stack);
  }
}

async function getPostJSON(url,browser) {
  try {
    let jsonPost = url + "?__a=1";
    const page = await browser.newPage();
    await page.goto(jsonPost);
    const content = await page.content();
    let innerText = await page.evaluate(() =>  {
      return JSON.parse(document.querySelector("body").innerText); 
    });
    await page.close();
    return innerText;
  } catch (error) {
    console.log(error)
  }
}

async function logIn(browser){
  try {
    const [login,password] = fs.readFileSync("login.txt", "utf-8").split(/\r?\n/);
    const page = await browser.newPage();
    await page.goto('https://www.instagram.com/accounts/login/');
    await page.waitFor('input[name=username]');
    await page.type('input[name=username]',login,{delay: 100})
    await page.type('input[name=password]',password,{delay: 100})
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.close();
  } catch (error) {
    console.log(error)
  }
}

async function getUrlFromPost(url,browser) {
  const response = {}
  try {
    response.data = await getPostJSON(url,browser);
  } catch (error) {
    console.log(error)
  }
  let urlArray = [];
  let type = response.data["graphql"]["shortcode_media"]["__typename"];
  let userName =
    response.data["graphql"]["shortcode_media"]["owner"]["username"];
  let rawData = new Date(
    Number(response.data["graphql"]["shortcode_media"]["taken_at_timestamp"]) *
      1000
  );
  let photoDate = `${rawData.getFullYear()}-${String(
    rawData.getMonth() + 1
  ).padStart(2, "0")}-${String(rawData.getDate()).padStart(2, "0")}`;
  if (type == "GraphSidecar") {
    let nodeArray =
      response.data["graphql"]["shortcode_media"]["edge_sidecar_to_children"][
        "edges"
      ];
    for (node of nodeArray) {
      let url = node["node"]["display_url"];
      let id = node["node"]["id"];
      urlArray.push([url, photoDate, id, userName]);
    }
  }
  if (type == "GraphImage") {
    let url = response.data["graphql"]["shortcode_media"]["display_url"];
    let id = response.data["graphql"]["shortcode_media"]["id"];
    urlArray.push([url, photoDate, id, userName]);
  }
  return urlArray;
}

async function downloadImage(array) {
  let [url, photoDate, id, userName] = array;
  let dir = `./images/${userName}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const path = Path.resolve(__dirname, dir, `${photoDate} ${id}.jpg`);
  const writer = fs.createWriteStream(path);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function start() {
  const browser = await puppeteer.launch({headless:false});
  let links = readLinkFromTxt();
  await logIn(browser);
  for (link of links) {
    const urlsArray = await getUrlFromPost(link,browser)
    urlsArray.forEach((array) => downloadImage(array));
  }
  await browser.close();
}

start();
