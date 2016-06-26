'use strict';

const request = require('request')
const fs = require('fs')


const mapquest = {
  //The object that interacts with the mapquest API
  baseURL: 'http://www.mapquestapi.com/directions/v2/route?key=MkRTKx7DbBySjsya4hnVsQ0bxgQgnbSy',

  calculateMileage(addresses){
    var url = this.baseURL + '&from=' + addresses[0];
    for(let i = 1; i < addresses.length; i++){
      url += '&to=' + addresses[i];
    }
    request(url, (error, response, body) => {
      if(!error && response.statusCode == 200){
        var results = JSON.parse(body)
        console.log(results.route.distance);
      }else{
        console.log('error')
      }
    })
  }
}

const savedAddresses = {
  addressFile: 'addresses.txt',
  getAddress(location){
    let addresses = fs.readFileSync(this.addressFile)
    let startIndex = addresses.indexOf(location)
    let endIndex = addresses.indexOf('\n', startIndex)
    let locationAddressString = addresses.toString('utf8', startIndex, endIndex)
    let address = locationAddressString.split('::')[1];
    return address;
  },
  saveAddress(location, address){
    fs.appendFile(this.addressFile, location + '::' + address + '\n', (err) => {
      if(err) throw err;
    })
  },
  isLocation(location){
    let addresses = fs.readFileSync(this.addressFile)
    return addresses.includes(location)
  }
}


const locationsDiv = document.getElementById('locations')
document.addEventListener('keydown', event => {
  if(event.keyCode === 9){ //tab key
    var locationElements = Array.prototype.slice.call(locationsDiv.childNodes) //converts childNodes object list into an array
    if(locationElements.includes(document.activeElement)){ //if a location input has focus
      if(document.activeElement.class === 'address'){
        locationsDiv.appendChild(document.createElement('br'))
        locationsDiv.appendChild(document.createElement('input'))
      }else{
        if(savedAddresses.isLocation(document.activeElement.value)){
          locationsDiv.appendChild(document.createElement('br'))
          locationsDiv.appendChild(document.createElement('input'))
        }else{
          var label = document.createElement('label')
          label.innerHTML = 'Address: ';
          var addressInput = document.createElement('input')
          addressInput.class = 'address';
          locationsDiv.appendChild(label)
          locationsDiv.appendChild(addressInput)
        }
      }
    }
  }
})

const submitButton = document.getElementById('submit')
submitButton.onclick = function(){
  var date = document.getElementById('date').value;
  var inputElements = Array.prototype.slice.call(locationsDiv.childNodes) //converts childNodes object list into an array
  var inputs = inputElements.filter((element) => {
    if(element.tagName === 'INPUT') return true;
    return false;
  })
  var locations = []
  var j = 0;
  for(let i = 0; i < inputs.length; i++){
    if(inputs[i].class === 'address'){
      let address = inputs[i].value;
      let location = inputs[i - 1].value;
      savedAddresses.saveAddress(location, address)
    }else{
      locations[j] = inputs[i].value
      //check if location exists
      j++
    }
  }
  var addresses = [];
  for(let i = 0; i < locations.length; i++){
    addresses[i] = savedAddresses.getAddress(locations[i])
  }
  mapquest.calculateMileage(addresses)
  return false; //stop the form from attemping to send data somewhere and reloading page
}
