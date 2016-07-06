'use strict';

const request = require('request')
const fs = require('fs')
const xlsx = require('xlsx-style')
const fuzzy = require('fuzzy')


const currentInfo = {
  excelFile: null,
  date: 0,
  locations: [],
  mileage: 0,

  getLocationString(){
    var locationArray = this.locations;
    locationArray.shift()
    locationArray.pop()
    var locationString = "";
    for(let i = 0; i < this.locations.length; i++){
      locationString = locationString + this.locations[i] + ', ';
    }
    locationString = locationString.slice(0, locationString.length - 2) //remove trailing comma
    return locationString;
  },
  report(){
    DOM.reportMileage(this.mileage);
    let locations = this.getLocationString()
    this.excelFile.writeInfo(this.date, locations, this.mileage)
  }
}

const DOM = {
  mileageDiv: document.getElementById('mileageResults'),

  getDate(){ return document.getElementById('date').value},
  getLocationsDiv(){ return document.getElementById('locations')},
  getInputForm(){ return document.getElementById('locationsForm')},
  getSubmitButton(){ return document.getElementById('submit')},
  getInputElements(){
    let childArray = Array.prototype.slice.call(this.getLocationsDiv().childNodes) //converts childNodes object list into an array
    let inputElements = childArray.filter((element) => {
      if(element.tagName === 'INPUT') return true;
      return false;
    })
    return inputElements;
  },
  setHomeInputs(){
    var settingsHome = document.getElementById('settingsHome');
    settingsHome.value = savedAddresses.getAddress('HOME');
    var inputNodes = this.getLocationsDiv().childNodes;
    for(var child = inputNodes[0]; child !== null; child = child.nextElementSibling){
      if(child.className == 'home'){
        child.value = 'HOME';
      }
    }
  },
  createNewLocationInput(activeElement){
    activeElement.insertAdjacentHTML('afterend', '<br><input>')
  },
  createNewAddressInput(activeElement){
    activeElement.insertAdjacentHTML('afterend', '<label>Address: </label><input class="address">')
  },
  displaySuggestions(activeElement, suggestions){
    //display that shit
  },
  reportMileage(mileage){
    this.mileageDiv.innerHTML = mileage;
  },
  resetInputForm(){
    this.getInputForm().innerHTML =
    "<label>Date: <input id = 'date'></label><br>" +
    "<label>Locations:</label><br>" +
    "<div id = 'locations'>" +
      "<input readonly class = 'home'>"+
      "<br><input>" +
      "<br><input readonly class = 'home'>" +
    "</div>" +
    "<br><input id = 'submit', type = 'submit'>";
    this.getSubmitButton().onclick = function(){submit()};
  }
}

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
        var mileage = Math.round(results.route.distance)
        currentInfo.mileage = mileage;
        currentInfo.report()
      }else{
        console.log('error')
      }
    })
  }
}

const savedAddresses = {
  addressFile: 'addresses.txt',
  locationList: [],

  createFile(){
    fs.stat('addresses.txt', (err) => {
      if(err && err.code == 'ENOENT') fs.closeSync(fs.openSync('addresses.txt', 'w'))
    })
  },
  getAddress(location){
    let addresses = fs.readFileSync(this.addressFile)
    let startIndex = addresses.indexOf(location)
    let endIndex = addresses.indexOf('\n', startIndex)
    let locationAddressString = addresses.toString('utf8', startIndex, endIndex)
    let address = locationAddressString.split('::')[1];
    return address;
  },
  saveAddress(location, address){
    if(this.isLocation(location)){
      let file = fs.readFileSync(this.addressFile, 'utf8');
      let oldAddress = this.getAddress(location);
      let regex = new RegExp(location + '::' + oldAddress, 'g');
      let result = file.replace(regex, location + '::' + address + '\n');
      fs.writeFileSync(this.addressFile, result, 'utf8')
    }else{
      fs.appendFileSync(this.addressFile, location + '::' + address + '\n')
    }
  },
  generateLocationList(){
    var addressFile = fs.readFileSync(this.addressFile),
        locations = [],
        startIndex = 0,
        endIndex = 0,
        offset = 0,
        i = 1;
    while((startIndex !== -1) && (endIndex !== -1)){
      endIndex = addressFile.indexOf('::', offset)
      locations[i] = addressFile.toString('utf8', startIndex, endIndex)
      offset = endIndex;
      startIndex = addressFile.indexOf('\n', offset) + 1;
      offset = startIndex;
      i++
    }
    this.locationList = locations;
  },
  isLocation(location){
    let locations = this.locationList;
    for(let i = 0; i < locations.length; i++){
      if(locations[i] == location) return true;
    }
    return false;
  }
}

const settingsFile = {
  file: 'settings.txt',

  createFile(){
    fs.stat('settings.txt', (err) => {
      if(err && err.code == 'ENOENT'){
        fs.appendFile('settings.txt', 'Output file::\n')
      }
    })
  },
  setOutputFile(newOutputFile){
    let fileString = fs.readFileSync(this.file, 'utf8');
    let regex = new RegExp('Output file::.*', 'g');
    let result = fileString.replace(regex, 'Output file::' + newOutputFile + '\n');
    fs.writeFileSync(this.file, result, 'utf8');
  },
  getOutputFile(){
    let fileString = fs.readFileSync(this.file, 'utf8');
    let regex = new RegExp('Output file::.*', 'g');
    let result = regex.exec(fileString)[0].split('::')[1];
    return result;
  }
}

class excel {
  constructor(file){
    this.file = file;
    this.workbook = xlsx.readFile(this.file, {cellNF: true, cellStyle: true})
    this.worksheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
  }

  findEmptyRow(){
    let range = this.worksheet['!ref'];
    let lastCell = range.split(':')[1];
    let lastRow = Number(lastCell.substring(1));
    return lastRow + 1;
  }

  writeInfo(date, locations, mileage){
    let row = this.findEmptyRow();
    this.worksheet['!ref'] = 'A1:C' + row.toString();
    this.worksheet['A' + row.toString()] = {w: undefined, v: date, t: 's'};
    this.worksheet['B' + row.toString()] = {w: undefined, v: locations, t: 's'};
    this.worksheet['C' + row.toString()] = {w: undefined, v: mileage, t: 'n'};
    xlsx.writeFile(this.workbook, this.file, {cellDates: true});
  }
}


function initialize(){
  document.getElementById('settingsButton').onclick = updateSettings;
  settingsFile.createFile()
  savedAddresses.createFile()
  savedAddresses.generateLocationList()
  if(savedAddresses.isLocation('HOME')){
    DOM.setHomeInputs();
  }else{
    alert('You have no set home location.  Setting a home location will reduce '+
    'the work you need to do.  To learn about home locations, please read the instructions, '+
    'which you can access from the start page.  To set a home location, enter it into the box '+
    'at the top of the page.');
  }
  var outputFile = settingsFile.getOutputFile();
  document.getElementById('settingsOutput').value = outputFile;
  if(outputFile == ""){
    alert('Please enter an output file.  The output file must be an excel file with file extension .xlsx');
  }
  fs.stat(outputFile, (err) => {
    if(err && err.code == 'ENOENT') return 0;
    currentInfo.excelFile = new excel(outputFile);
  })
}
setTimeout(initialize, 50) //wait 50ms so the document elements will render(window.onload does not work)


function updateSettings(){
  const settingsHome = document.getElementById('settingsHome');
  const settingsOutput = document.getElementById('settingsOutput');
  savedAddresses.saveAddress('HOME', settingsHome.value);
  settingsFile.setOutputFile(settingsOutput.value);
}

document.addEventListener('keydown', event => {
  var inputElements = DOM.getInputElements();
  if(inputElements.includes(document.activeElement)){
    if(event.keyCode === 9){
      if(document.activeElement.className === 'address'){
        DOM.createNewLocationInput(document.activeElement);
      }else{
        if(savedAddresses.isLocation(document.activeElement.value)){
          if(document.activeElement.className !== 'home') DOM.createNewLocationInput(document.activeElement);
        }else{
          DOM.createNewAddressInput(document.activeElement);
        }
      }
    }else{
      //this function occurs before the element value is updated; therefore it is done here manually
      var input = "";
      var location = document.activeElement.value;
      if((65 <= event.keyCode && event.keyCode <= 90) || event.keyCode == 32){
        input = String.fromCharCode(event.keyCode);
        if(!event.shiftKey) input = input.toLowerCase();
        location += input;
      }else if(event.keyCode == 8){
        location = location.slice(0, location.length - 1)
      }
      if(savedAddresses.isLocation(location)){
        document.activeElement.style.color = 'green';
      }else{
        document.activeElement.style.color = 'red';
        var suggestions = fuzzy.filter(location, savedAddresses.locationList);
        while(suggestions.length > 5) suggestions.pop()
        suggestions = suggestions.map((suggestion) => {return suggestion.string})
        //DOM.displaySuggestions(document.activeElement, suggestions)
        console.log(suggestions)
      }
    }
  }
})

DOM.getSubmitButton().onclick = function(){submit()};
function submit(){
  currentInfo.date = DOM.getDate();
  var inputElements = DOM.getInputElements()
  var locations = []
  for(let i = 0; i < inputElements.length; i++){
    if(inputElements[i].className === 'address'){
      let address = inputElements[i].value;
      let location = inputElements[i - 1].value;
      savedAddresses.saveAddress(location, address)
    }
  }
  savedAddresses.generateLocationList()
  var j = 0;
  for(let i = 0; i < inputElements.length; i++){
    if(inputElements[i].className == "" || inputElements[i].className == 'home'){
      if(savedAddresses.isLocation(inputElements[i].value)){
        locations[j] = inputElements[i].value
        j++
      }else{
        alert('Please enter the address for ' + inputElements[i].value)
        return false
      }
    }
  }
  currentInfo.locations = locations;
  var addresses = [];
  for(let i = 0; i < locations.length; i++){
    addresses[i] = savedAddresses.getAddress(locations[i])
  }
  mapquest.calculateMileage(addresses)
  DOM.resetInputForm()
  if(savedAddresses.isLocation('HOME')) DOM.setHomeInputs()
  return false; //stop the form from attemping to send data somewhere and reloading page
}
