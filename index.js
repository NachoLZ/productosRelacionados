const express = require('express')
const app = express();
const googleTrends = require('google-trends-api');
let googleNewsAPI = require("google-news-json");
const bodyParser = require('body-parser'); // middleware
const cors = require('cors');
const nodemailer = require("nodemailer");

var jsonParser = bodyParser.json({limit:1024*1024*10, type:'application/json'});
var urlencodedParser = bodyParser.urlencoded({ extended: false }); 

app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

'use strict';

const fs = require('fs');

var datos = [

];

// Route to Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/form.html');
});

app.get('/interesRegion/:aBuscar', (req, res) => {
  googleTrends.interestByRegion({ keyword: req.params.aBuscar, startTime: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), geo: 'CL' }) //interes por region en los últimos 12 meses
    .then((resp) => {
      //console.log(resp);
      const respForm = JSON.parse(resp); //parsea la respuesta de GTrends a un objeto
      const respCasi = (Object.values(respForm))[0]
      const respFinal = Object.values(respCasi)[0]
      //respFinal.forEach((x, i) => console.log(x));
      //console.log(respFinal);
      res.send(respFinal);
    })
    .catch((err) => {
      console.log(err);
    })
});

app.get('/interesTiempo/:aBuscar', (req, res) => {
  googleTrends.interestOverTime({ keyword: req.params.aBuscar, startTime: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), geo: 'CL' })
    .then((results) => {
      const respForm = JSON.parse(results); //parsea respuesta a un objeto
      const respCasi = (Object.values(respForm))[0]; //default
      const respCasi2 = Object.values(respCasi)[0]; //timelineData
      respCasi2.forEach((x, i) => datos.push([new Date(x.formattedAxisTime), x.value[0]]));
      if (datos.length == 0) {
        aux = req.params.aBuscar.split(" ");
        nuevoABuscar = "";
        aux.forEach((x, i) => {
          if (i == 0) {
            nuevoABuscar = x;
          } else if (i != (aux.length - 1)) {
            nuevoABuscar = nuevoABuscar + " " + x;
          }
        })
        googleTrends.interestOverTime({ keyword: nuevoABuscar, startTime: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), geo: 'CL' })
          .then((results) => {
            const respForm = JSON.parse(results); //parsea respuesta a un objeto
            const respCasi = (Object.values(respForm))[0]; //default
            const respCasi2 = Object.values(respCasi)[0]; //timelineData
            respCasi2.forEach((x, i) => datos.push([new Date(x.formattedAxisTime), x.value[0]]));
            res.send(datos);
            datos.length = 0;
          });
      } else {
        res.send(datos);
        datos.length = 0;
      }
    })
    .catch(function (err) {
      console.error(err);
    });
});

app.get('/topicos/:aBuscar', (req, res) => { //busquedas relacionadas state.nombre
  googleTrends.relatedTopics({ keyword: req.params.aBuscar, startTime: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), geo: 'CL' })
    .then((resp) => {

      const respForm = JSON.parse(resp); //parsea la respuesta de GTrends a un objeto
      const respCasi = (Object.values(respForm))[0]
      const respCasi2 = Object.values(respCasi)[0]
      respFinal = Object.values(respCasi2[0])[0]
      var env = "a";
      if (respFinal.length == 0) {
        aux = req.params.aBuscar.split(" ");
        nuevoABuscar = "";
        aux.forEach((x, i) => {
          if (i == 0) {
            nuevoABuscar = x;
          } else if (i != (aux.length - 1)) {
            nuevoABuscar = nuevoABuscar + " " + x;
          }
        })
        //si no encuentra con el nombre completo
        googleTrends.relatedTopics({ keyword: nuevoABuscar, startTime: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), geo: 'CL' })
          .then((resp) => {
            const respForm = JSON.parse(resp); //parsea la respuesta de GTrends a un objeto
            const respCasi = (Object.values(respForm))[0]
            const respCasi2 = Object.values(respCasi)[0]
            respFinal = Object.values(respCasi2[0])[0]
            if (respFinal.length == 0) { //sin el modelo
              env = "NO";
            }
          });
      }
      if (env == "NO") {
        res.send(env);
      } else {
        var arr = [];

        //console.log(respFinal)

        const fs = require('fs');
        const path = require('path');
        const csv = require('fast-csv');

        var i = 0;

        fs.createReadStream(path.resolve(__dirname, 'csv', 'scraper.csv'))
          .pipe(csv.parse({ headers: true }))
          .on('error', error => console.error(error))
          .on('data', row => {
            if (row.Nombre.includes("CALL OF DUTY")) {
              arr.push({ 'nameProd': row.Nombre, 'linkProd': row.link });
              i = i + 1;
              if (i == 3) {
                res.send(arr)
              }
            }
          })
        //.on('end', rowCount => console.log(arr));
      }
    })
    .catch((err) => {
      console.log(err);
    })
}
);

app.get('/noticias/:aBuscar', (req, res) => {
  googleNewsAPI.getNews(googleNewsAPI.SEARCH, req.params.aBuscar, "es-CL", (err, response) => {
    if (response.items.length == 0) { //si no hay noticias para el nombre completo, saca la ultima palabra (el modelo)
      aux = req.params.aBuscar.split(" ");
      nuevoABuscar = "";
      aux.forEach((x, i) => {
        if (i == 0) {
          nuevoABuscar = x;
        } else if (i != (aux.length - 1)) {
          nuevoABuscar = nuevoABuscar + " " + x;
        }
      })
      googleNewsAPI.getNews(googleNewsAPI.SEARCH, nuevoABuscar, "es-CL", (err2, response2) => {
        if (response2.items.length == 0) {
          res.send("NO"); //no hay ni sacando el modelo
        } else {
          var arr = [];
          arr.push(response2.items[0]);
          arr.push(response2.items[1]);
          arr.push(response2.items[2]);
          res.send(arr);
        }
      });
    } else {
      var arr = [];
      arr.push(response.items[0]);
      arr.push(response.items[1]);
      arr.push(response.items[2]);
      res.send(arr);
    }
  });
});

async function mandarMail(correo,archivo){
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "contactprice2be@gmail.com", // generated ethereal user
      pass: "Price2Be691313", // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: 'contactprice2be@gmail.com', // sender address
    to: correo, // list of receivers
    subject: "Reporte de estudio de mercado", // Subject line
    text: "Hola! puedes descargar tu reporte de estudio de mercado aqui: ", // plain text body
    attachments: [{
      filename: 'estudio_mercado.pdf',
      path: archivo,
      contentType: 'application/pdf'
    }]
    //html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
}

app.post("/sendMail", jsonParser, function (req,res) { 
  console.log(req.body);
  var nuevo = req.body.archivo.replace('data:application/pdf;base64,','')
  fs.writeFile('result_base64.pdf', nuevo, 'base64', error => {
    if (error) {
        throw error;
    } else {
        console.log('base64 saved!');
    }
  });
  mandarMail(req.body.titulo,'result_base64.pdf').then(_ => fs.unlinkSync('result_base64.pdf'));
})

app.listen(8000, () => {
  console.log('Example app listening on port 8000!')
});
