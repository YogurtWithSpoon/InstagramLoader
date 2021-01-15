const fs = require("fs");
const axios = require("axios");
const Path = require("path");

function readLinkFromTxt() {
  try {
    let data = fs.readFileSync("links.txt", "utf-8");
    let linksArray = data.split(/\r?\n/);
    return linksArray;
  } catch (e) {
    console.log("Error:", e.stack);
  }
}

function getUrlFromPost(url) {
  let jsonPost = url + "?__a=1";
  return axios.get(jsonPost).then((response) => {
    let urlArray = []
    let type = response.data["graphql"]["shortcode_media"]["__typename"];
    let userName = response.data["graphql"]["shortcode_media"]["owner"]["username"]
    let rawData = new Date(Number(response.data["graphql"]["shortcode_media"]["taken_at_timestamp"]) * 1000)
    let photoDate = `${rawData.getFullYear()}-${String(rawData.getMonth() + 1).padStart(2,'0')}-${String(rawData.getDate()).padStart(2,'0')}`
    if (type == "GraphSidecar") {
      let nodeArray =
        response.data["graphql"]["shortcode_media"]["edge_sidecar_to_children"][
          "edges"
        ];
      for (node of nodeArray) {
        let url = node["node"]["display_url"];
        let id = node["node"]["id"];
        urlArray.push([url,photoDate,id,userName]);
      }
    }
    if (type == "GraphImage") {
      let url = response.data["graphql"]["shortcode_media"]["display_url"];
      let id = response.data["graphql"]["shortcode_media"]["id"];
      urlArray.push([url,photoDate,id,userName]);
    }
    return urlArray;
  });
}

async function downloadImage(array) {
  let [url,photoDate,id,userName] = array
  let dir = `./images/${userName}`
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir)
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

function start() {
  let links = readLinkFromTxt();
  for (link of links) {
    getUrlFromPost(link).then((urlsArray) => {
      urlsArray.map((array) => downloadImage(array));
    });
  }
  console.log("done");
}

start();
