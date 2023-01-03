const express = require('express');
const app = express();
const path = require('path');
const port = 3000;
const mysql = require('mysql')
const dotenv = require('dotenv')
dotenv.config()

// SingleStore Connection Setup
// Put your Singlestore Credential in .env file
const HOST = process.env.SINGLESTORE_HOST;
const USER = process.env.SINGLESTORE_USER;
const PASSWORD = process.env.SINGLESTORE_PASSWORD;
const DATABASE = process.env.SINGLESTORE_DB;
const DB_PORT = process.env.SINGLESTORE_DB_PORT;

var connection = mysql.createConnection({
  host: HOST,
  user: USER,
  password: PASSWORD,
  database: DATABASE,
  port: DB_PORT,
})

const animalFullTextTemplate = 
'SELECT id, name, image_url, source_url, note, location FROM animal INNER JOIN animal_geo ON animal.id=animal_geo.animal_id WHERE MATCH (name, note) AGAINST (?);'
const animalWKTShapeTemplate = 
'SELECT id, name, image_url, source_url, note, location FROM animal INNER JOIN animal_geo ON animal.id=animal_geo.animal_id WHERE GEOGRAPHY_INTERSECTS(location, ?);'

// Server 
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
  res.render("index")
})

// Get the animals based on the text and note
app.get("/api/v1/animals/fromText/:text/", (req, res) => {
  let text = req.params.text
  connection.query(animalFullTextTemplate, [text], function(error, result) {
    if (error)
      res.status(500).send("Something went wrong")

    if (result === null)
      res.status(404).send(`No result !!`)
    else
      res.status(200).json(result)
  })
})

// Get the animals based on the generated polygons
app.get("/api/v1/animals/fromArea/:shape/", (req, res) => {
  let geoWKTShape = req.params.shape
  geoWKTShape = geoWKTShape.replaceAll('_', ' ')

  connection.query(animalWKTShapeTemplate, [geoWKTShape], function(error, result) {
    if (error)
      res.status(500).send("Something went wrong")

    if (result === null)
      res.status(404).send(`No result !!`)
    else
      res.status(200).json(result)
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})