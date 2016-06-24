'use strict';

const request = require('request')
const fs = require('fs')


const mapquest = {
  //The object that interacts with the mapquest API
  baseURL: 'http://www.mapquestapi.com/directions/v2/route?key=MkRTKx7DbBySjsya4hnVsQ0bxgQgnbSy',

  calculateMileage(addresses){

  }
}

const savedAddresses = {
  addressFile: 'addresses.txt',
  getAddress(location){
    fs.readFile(this.addressFile, (err, data) => {
      if(err) throw err;
      var startIndex = data.indexOf(location)
      if(startIndex != 1){
        var endIndex = data.indexOf('\n', startIndex)
        var locationString = data.toString('utf8', startIndex, endIndex)
        return locationString.split('::')[1];
      }else{
        return false;
      }
    })
  },
  saveAddress(location, address){
    fs.appendFile(this.addressFile, location + '::' + address + '\n', (err) => {
      if(err) throw err;
    })
  },
  isLocation(location){
    fs.readFile(this.addressFile, (err, data) => {
      if(err) throw err;
      return data.includes(location)
    })
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
      j++
    }
  }
  console.log(locations)
  return false; //stop the form from attemping to send data somewhere and reloading page
}
