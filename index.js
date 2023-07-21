const express = require("express");
const faceapi = require("face-api.js");
const sql = require("mssql");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const fileUpload = require("express-fileupload");
faceapi.env.monkeyPatch({ Canvas, Image });
const config = "mssql://ayoub:ayoub@localhost:63299/gestion-tickets";
const multer = require("multer");
const app = express();
const Blob = require("node-blob");
const fs = require("fs");

var dataUriToBuffer = require("data-uri-to-buffer");
const path = require("path");
app.use(fileUpload({ useTempFiles: true }));
async function LoadModels() {
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}
LoadModels();

app.post("/post", async (req, res) => {
  let u = dataUriToBuffer("data:image/jpg;base64," + req.body.photo);
  await fs.writeFile(`./Comptes/${req.body.label}.jpg`, u, async (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("File created successfully!");
      let oo = `C:\\Users\\AYOUB\\Desktop\\reactNativePointage\\expressreco\\Comptes\\${req.body.label}.jpg`;
      const img = await canvas.loadImage(oo);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      const descriptions = [];
      for (i = 1; i <= 3; i++) {
        descriptions.push(detections.descriptor);
      }
      sql.connect(config, function (err) {
        if (err) console.log(err);
        var request = new sql.Request();
        let date_ob = new Date();

        let date = ("0" + date_ob.getDate()).slice(-2);

        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

        let year = date_ob.getFullYear();

        let hours = date_ob.getHours();

        let minutes = date_ob.getMinutes();

        let seconds = date_ob.getSeconds();

        let finDate =
          date +
          "-" +
          month +
          "-" +
          year +
          "-" +
          hours +
          "-" +
          minutes +
          "-" +
          seconds;
        request.input("descriptions", JSON.stringify(descriptions));
        request.input("label", req.body.label);
        request.input("photo", req.body.photo);
        request.input("date", finDate);
        request.query(
          "insert into faceApi (label,descriptions,photo,dateCreation) Values(@label,@descriptions,@photo,@date)",
          function (err, user) {
            if (err) console.log(err);
            console.log("hola");
          }
        );
      });
    }
  });
});

app.post("/stat", async (req, res) => {
  console.log(req.body.filee.length);
  if (req.body.filee.length != 4) {
    let u = dataUriToBuffer("data:image/jpg;base64," + req.body.filee);
    await fs.writeFile(`./Assets/image.jpg`, u, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("File created successfully!");
        sql.connect(config, function (err) {
          if (err) console.log(err);
          var request = new sql.Request();
          request.query(
            "select * from faceApi",
            async function (err, reponsee) {
              if (err) console.log(err);
              let faces = reponsee.recordset;
              for (i = 0; i < faces.length; i++) {
                let x = [];

                for (j = 0; j < JSON.parse(faces[i].descriptions).length; j++) {
                  x.push(
                    new Float32Array(
                      Object.values(JSON.parse(faces[i].descriptions)[j])
                    )
                  );
                }

                faces[i] = new faceapi.LabeledFaceDescriptors(
                  faces[i].label,
                  x
                );
              }

              const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);
              let oo = `C:\\Users\\AYOUB\\Desktop\\reactNativePointage\\expressreco\\Assets\\image.jpg`;

              const img = await canvas.loadImage(oo);
              console.log(img);

              let temp = faceapi.createCanvasFromMedia(img);
              console.log(temp);
              const displaySize = { width: img.width, height: img.height };
              console.log(displaySize);
              faceapi.matchDimensions(temp, displaySize);
              const detections = await faceapi
                .detectAllFaces(img)
                .withFaceLandmarks()
                .withFaceDescriptors();
              console.log(detections);
              const resizedDetections = faceapi.resizeResults(
                detections,
                displaySize
              );

              const results = await resizedDetections.map((d) =>
                faceMatcher.findBestMatch(d.descriptor)
              );
              if (results[0] === undefined || results[0] === "unknown") {
                res.send({ oyo: "prob" });
              } else {
                res.send({ aya: results[0].label });
                let date_ob = new Date();

                let date = ("0" + date_ob.getDate()).slice(-2);

                let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

                let year = date_ob.getFullYear();

                let hours = date_ob.getHours();

                let minutes = date_ob.getMinutes();

                let seconds = date_ob.getSeconds();

                let finDate =
                  date +
                  "-" +
                  month +
                  "-" +
                  year +
                  "-" +
                  hours +
                  "-" +
                  minutes +
                  "-" +
                  seconds;
                fs.rename(
                  `./Assets/image.jpg`,
                  `./Assets/${results[0].label.replace(" ", "")}${finDate}.jpg`,
                  (err) => {
                    console.log(err);
                  }
                );
                sql.connect(config, function (err) {
                  if (err) console.log(err);
                  var request = new sql.Request();
                  request.input("label", results[0].label);
                  request.input("date", finDate);
                  request.query(
                    "UPDATE facialReco SET dernierPointage=@date WHERE label=@label",
                    function (err, user) {
                      if (err) console.log(err);
                    }
                  );
                });
              }
            }
          );
        });
      }
    });
  } else res.send({ aya: "oww" });
});

app.listen(4000);
console.log("DB connected and server us running.");
