const fs = require("fs");
const axios = require("axios");
const Path = require("path");
let globalName = 1;

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
    let urlArray = [];
    let type = response.data["graphql"]["shortcode_media"]["__typename"];
    if (type == "GraphSidecar") {
      let nodeArray =
        response.data["graphql"]["shortcode_media"]["edge_sidecar_to_children"][
          "edges"
        ];
      for (node of nodeArray) {
        let url = node["node"]["display_url"];
        urlArray.push(url);
      }
    }
    if (type == "GraphImage") {
      let url = response.data["graphql"]["shortcode_media"]["display_url"];
      urlArray.push(url);
    }
    return urlArray;
  });
}

async function downloadImage(url) {
  const path = Path.resolve(__dirname, "images", `${globalName}.png`);
  globalName++;
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
      urlsArray.map((url) => downloadImage(url));
    });
  }
  console.log("done");
}

start();
