var map = L.map('map', 
    {
      drawControl: true,
    }
).setView([42.244272, 34.715062], 1.5)

// L.DomUtil.addClass(map._container,'crosshair-cursor-enabled');

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomain: ['a', 'b', 'c']
}).addTo(map)

var drawnItems = new L.FeatureGroup()
var currentLayer = null
map.addLayer(drawnItems)

map.on(L.Draw.Event.CREATED, function (e) {
  let type = e.layerType
  if (currentLayer !== null) map.removeLayer(currentLayer) 
  currentLayer = e.layer

  if (type === 'circle' || type === 'polyline'){
    alert("Disable shape at the current moment !!")
  } else {
    
      let wktLayer = toWKT(currentLayer)
      wktLayer = wktLayer.replaceAll(' ', '_')
    
      fetch("/api/v1/animals/fromArea/" + wktLayer)
      .then((response) => response.json())
      .then((data) => processAnimalData(data))
    
      // Do whatever else you need to. (save to db; add to map etc)
      map.addLayer(currentLayer)
  }
})

// SET UP WITH SERVER
var animal_list = document.getElementById("animal_list")
var groupLayers = L.layerGroup()             

// Search Bar Form
document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault()
  if (currentLayer !== null) map.removeLayer(currentLayer) 
  const data = Object.fromEntries(new FormData(e.target).entries())
  const text = data["info"]

  fetch("/api/v1/animals/fromText/" + text)
  .then((response) => response.json())
  .then((data) => processAnimalData(data))
})

// Helper function
function createAnimalCard(id, name, note, imageUrl, sourceUrl, arrayCoords) {
  const colors = ["#ff1100", "#efb915", "#067be4"]
  let arrayLatlngs = arrayCoords
  let index = Math.floor(id % colors.length)
  
  let cardDiv = document.createElement("div")
  let rowDiv = document.createElement("div")
  let imgColDiv = document.createElement("div")
  let img = document.createElement("img")
  let cardColDiv = document.createElement("div")
  let cardBodyDiv = document.createElement("div")
  let cardTitle = document.createElement("h5")
  let cardText = document.createElement("p")
  let smallText = document.createElement("small")
  let cardSourceLink = document.createElement("a")

  // Set up the class name for Boostrap
  cardDiv.className = "card mb-3 card-hover"
  rowDiv.className = "row g-0"
  imgColDiv.className = "col-md-4"
  img.className = "img-fluid rounded-start mx-auto"
  cardColDiv.className = "col-md-8"
  cardBodyDiv.className = "card-body"
  cardTitle.className = "card-title text-capitalize"
  cardText.className = "card-text"
  smallText.className = "text-muted"
  cardSourceLink.className = "card-link"
  
  // Set the attribute
  img.src = imageUrl
  img.alt = "Animal Image"
  cardSourceLink.href = sourceUrl
  const textNote = document.createTextNode(note)
  const titleNote = document.createTextNode(name)
  const sourceNote = document.createTextNode("More Details")
  smallText.appendChild(textNote)
  cardTitle.appendChild(titleNote)
  cardSourceLink.appendChild(sourceNote)

  // Set up the layer connection with the animal card
  let layerIds = []
  arrayLatlngs.forEach(latlng => {
    let layer = L.polygon(latlng, {color: null, stroke: null})
    layer.setStyle({fillOpacity: 0})
    groupLayers.addLayer(layer)
    let layerId = groupLayers.getLayerId(layer)
    layerIds.push(layerId)
  })

  function changeLayer(index, opacity) {
    let color = index >= 0 ? colors[index] : ""
    let lids = cardDiv.getAttribute("data-layer-id")
    lids = lids.split(',')
    lids.forEach(lid => {
      let layer = groupLayers.getLayer(Number(lid))
      layer.setStyle({color: color, fillOpacity: opacity})
    })
  }

  cardDiv.setAttribute("data-layer-id", layerIds.toString())
  cardDiv.addEventListener("mouseover", function highlightLayer(){
    changeLayer(index, 0.4)
  })
  
  cardDiv.addEventListener("mouseout", function hiddenLayer(){
    changeLayer(-1, 0)
  })

  // Connect the element
  cardDiv.appendChild(rowDiv)
  rowDiv.appendChild(imgColDiv)
  rowDiv.appendChild(cardColDiv)
  imgColDiv.appendChild(img)
  cardColDiv.appendChild(cardBodyDiv)
  cardBodyDiv.appendChild(cardTitle)
  cardBodyDiv.appendChild(cardText)
  cardBodyDiv.appendChild(cardSourceLink)
  cardText.appendChild(smallText)

  // Append the card to the list
  animal_list.appendChild(cardDiv)
}

function displayCard(data){
  // Remove existing layer and animal list
  resetAnimalList()
  
  data.forEach(animal => {
    createAnimalCard(animal['id'], animal['name'], 
      animal['note'], animal['image_url'], 
      animal['source_url'], animal['location']
      )
  })

  // Add the layer group into the map
  groupLayers.addTo(map)
}

function resetAnimalList(){
  while(animal_list.firstChild)
    animal_list.removeChild(animal_list.firstChild)
  groupLayers.eachLayer(layer => map.removeLayer(layer))
}

function toWKT(layer) {
  var lng, lat, coords = [];
  if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      var latlngs = layer.getLatLngs()
      latlngs = latlngs[0]
      for (var i = 0; i < latlngs.length; i++) {
        coords.push(latlngs[i].lng + " " + latlngs[i].lat)
        if (i === 0) {
          lng = latlngs[i].lng;
          lat = latlngs[i].lat;
        }
      };
      if (layer instanceof L.Polygon) {
          return "POLYGON((" + coords.join(",") + "," + lng + " " + lat + "))"
      } else if (layer instanceof L.Polyline) {
          return "LINESTRING(" + coords.join(",") + ")"
      }
  } else if (layer instanceof L.Marker) {
      return "POINT(" + layer.getLatLng().lng + " " + layer.getLatLng().lat + ")"
  }
}

function WKTStringToArray(wktStr) {
  let cleanedText = wktStr.split("POLYGON").pop()
  cleanedText = cleanedText.replace("((", '').replace("))", '')
  let coords = cleanedText.split(", ")
  let finalCoord = []
  coords.forEach(coord => {
    let convertCoord = coord.split(' ')
    let n_lng = Number(convertCoord[0].trim())
    let n_lat = Number(convertCoord[1].trim())
    let n_coord = []
    n_coord[0] = n_lat
    n_coord[1] = n_lng
    finalCoord.push(n_coord)
  })
  return finalCoord
}

function processAnimalData(data){
  const cleanned_data = []
  const uniqueId = new Set()

  if (data.length > 0){
    data.forEach(row => {
      if (uniqueId.has(row['id'])) {
        let savedRecord = cleanned_data.filter(record => record['id'] == row['id'])[0]
        let coord = WKTStringToArray(row['location'])
        savedRecord['location'].push(coord)
      } else {
        uniqueId.add(row['id'])
        let coordWKT = row['location']
        row['location'] = []
        row['location'].push(WKTStringToArray(coordWKT))
        cleanned_data.push(row)
      }
    })

    // Display the information in the animal card
    displayCard(cleanned_data)
  } else {
    resetAnimalList()
    animal_list.appendChild(document.createTextNode("No matching animals"))
  }
}