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
    DOM.resultsDiv.innerHTML += '<br>Got response: ' + this.mileage + ' miles';
    let locations = this.getLocationString()
    this.excelFile.writeInfo(this.date, locations, this.mileage)
  }
}

const DOM = {
  resultsDiv: document.getElementById('results'),
  getDateElement(){ return document.getElementById('date')},
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
    settingsHome.value = savedAddresses.locationsDict['HOME'];
    var inputNodes = this.getLocationsDiv().childNodes;
    for(var child = inputNodes[0]; child !== null; child = child.nextElementSibling){
      if(child.className == 'home'){
        child.value = 'HOME';
      }
    }
  },
  createNewLocationInput(activeElement){
    activeElement.insertAdjacentHTML('afterend', '<br><button class = "deleteInput">X</button><input>')
    var deleteButtonList = document.getElementsByClassName('deleteInput')
    var newDeleteButton = deleteButtonList[deleteButtonList.length - 1]
    newDeleteButton.onclick = () => {
      this.getLocationsDiv().removeChild(newDeleteButton.previousElementSibling)
      this.getLocationsDiv().removeChild(newDeleteButton.nextElementSibling)
      this.getLocationsDiv().removeChild(newDeleteButton)
    }
    newDeleteButton.focus() //since this method runs before default tab actions occur, we must focus on the element before the one we want to actually be focused after a tab
  },
  createNewAddressInput(activeElement){
    activeElement.insertAdjacentHTML('afterend', '<label>Address: </label><input class="address">')
  },
  displaySuggestions(suggestions){
    if(!document.getElementById('suggestionBox')){
      if(suggestions.length == 0) return false;
      var suggestionBox = document.createElement('div');
      suggestionBox.id = 'suggestionBox';
      document.body.appendChild(suggestionBox)
      for(let i = 0; i < suggestions.length; i++){
        let suggestion = document.createElement('div');
        suggestion.innerHTML = (i + 1).toString() + '.  ' + suggestions[i];
        suggestion.className = 'suggestion';
        suggestionBox.appendChild(suggestion)
      }
    }else{
      var suggestionBox = document.getElementById('suggestionBox')
      if(suggestions.length == 0) document.body.removeChild(suggestionBox);
      var suggestionElements = document.getElementsByClassName('suggestion');
      while(suggestions.length != suggestionElements.length){
        if(suggestions.length < suggestionElements.length){
          suggestionBox.removeChild(suggestionBox.lastChild)
        }else{
          let newSuggestion = document.createElement('div');
          newSuggestion.className = 'suggestion';
          suggestionBox.appendChild(newSuggestion);
        }
      }
      for(let i = 0; i < suggestions.length; i++){
        suggestionElements[i].innerHTML = (i + 1).toString() + '.  ' + suggestions[i];
      }
    }
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
  baseURL: 'http://www.mapquestapi.com/directions/v2/route?key=MkRTKx7DbBySjsya4hnVsQ0bxgQgnbSy&ambiguities=check',

  calculateMileage(addresses){
    var url = this.baseURL + '&from=' + addresses[0];
    for(let i = 1; i < addresses.length; i++){
      url += '&to=' + addresses[i];
    }
    request(url, (error, response, body) => {
      if(!error && response.statusCode == 200){
        var results = JSON.parse(body)
        if(results.info.statuscode === 0){
          var mileage = Math.round(results.route.distance)
          currentInfo.mileage = mileage;
          currentInfo.report()
        }else{
          DOM.resultsDiv.innerHTML += '<br>Recieved bad response from Mapquest. Please check addresses for errors.';
          console.log(results.collections)
        }
        
      }else{
        console.log('error')
      }
    })
    DOM.resultsDiv.innerHTML += '<br>Queried Mapquest';
  }
}

const savedAddresses = {
  addressFile: 'addresses.txt',
  locationsDict: {},
  locationsList: [],

  createFile(){
    try{
      let file = fs.statSync('addresses.txt')
    } catch(err){
      if(err.code == 'ENOENT') fs.closeSync(fs.openSync('addresses.txt', 'w'))
    }
  },
  saveAddress(location, address){
    if(this.isLocation(location)){
      let file = fs.readFileSync(this.addressFile, 'utf8');
      let oldAddress = this.locationsDict[location];
      let regex = new RegExp(location + '::' + oldAddress, 'g');
      let result = file.replace(regex, location + '::' + address + '\n');
      fs.writeFileSync(this.addressFile, result, 'utf8')
    }else{
      fs.appendFileSync(this.addressFile, location + '::' + address + '\n')
    }
  },
  generateLocations(){
    var addressFile = fs.readFileSync(this.addressFile),
        locationsDict = {},
        locationsList = [],
        startIndex = 0,
        endIndex = 0,
        offset = 0,
        i = 1;
    while((startIndex !== -1) && (endIndex !== -1)){
      endIndex = addressFile.indexOf('\n', offset);
      if(addressFile.toString('utf8', startIndex, endIndex).length > 0){
        let locationAddressArray = addressFile.toString('utf8', startIndex, endIndex).split('::');
        let location = locationAddressArray[0];
        let address = locationAddressArray[1];
        locationsDict[location] = address;
        locationsList[i] = location;
      }
      offset = endIndex;
      startIndex = addressFile.indexOf('\n', offset) + 1;
      offset = startIndex;
      i++;
    }
    this.locationsDict = locationsDict;
    this.locationsList = locationsList;
  },
  isLocation(location){
    if(this.locationsDict[location]) return true;
    return false;
  }
}

const settingsFile = {
  file: 'settings.txt',

  createFile(){
    try{
      let file = fs.statSync('addresses.txt')
    }catch(err){
      if(err.code == 'ENOENT') fs.appendFileSync('settings.txt', 'Output file::\n')
    }
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
    DOM.resultsDiv.innerHTML += '<br>Updated ' + this.file;
  }
}


function initialize(){
  document.getElementById('settingsButton').onclick = updateSettings;
  settingsFile.createFile()
  savedAddresses.createFile()
  savedAddresses.generateLocations()
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
  }else{
    fs.stat(outputFile, (err) => {
      if(err && err.code == 'ENOENT'){alert('Your output file cannot be found')}
      else{currentInfo.excelFile = new excel(outputFile)}
    })
  }
  DOM.getDateElement().focus()
}
setTimeout(initialize, 50) //wait 50ms so the document elements will render(window.onload does not work)


function updateSettings(){
  const settingsHome = document.getElementById('settingsHome');
  const settingsOutput = document.getElementById('settingsOutput');
  savedAddresses.saveAddress('HOME', settingsHome.value);
  savedAddresses.locationsDict['HOME'] = settingsHome.value;
  DOM.setHomeInputs();
  fs.stat(settingsOutput.value, err => {
    if(err && err.code == 'ENOENT'){alert('Cannot find ' + settingsOutput.value)}
    else{
      settingsFile.setOutputFile(settingsOutput.value)
      currentInfo.excelFile = new excel(settingsOutput.value)
    }
  })
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
          document.body.removeChild(document.getElementById('suggestionBox'));
        }
      }
    }else if(49 <= event.keyCode && event.keyCode <= 57 && event.ctrlKey && document.getElementById('suggestionBox')){
      let suggestions = document.getElementsByClassName('suggestion')
      let selection = event.keyCode - 49;
      let selectedSuggestion = suggestions[selection].innerHTML.slice(4);
      document.activeElement.value = selectedSuggestion;
      if(savedAddresses.isLocation(selectedSuggestion)) document.activeElement.style.color = 'green';
      document.body.removeChild(document.getElementById('suggestionBox'))
    }else if(document.activeElement.className == ""){
      //this function occurs before the element value is updated; therefore it is done here manually
      var input = "";
      var location = document.activeElement.value;
      if((65 <= event.keyCode && event.keyCode <= 90) || event.keyCode == 32){ //letter key or spacebar
        input = String.fromCharCode(event.keyCode);
        if(!event.shiftKey) input = input.toLowerCase();
        location += input;
      }else if(event.keyCode == 8){ //backspace
        location = location.slice(0, location.length - 1)
      }
      if(savedAddresses.isLocation(location)){
        document.activeElement.style.color = 'green';
        if(document.getElementById('suggestionBox')){
          document.body.removeChild(document.getElementById('suggestionBox'));
        }
      }else{
        document.activeElement.style.color = 'red';
        var suggestions = fuzzy.filter(location, savedAddresses.locationsList);
        while(suggestions.length > 5) suggestions.pop()
        suggestions = suggestions.map((suggestion) => {return suggestion.string})
        DOM.displaySuggestions(suggestions)
      }
    }
  }
})

DOM.getSubmitButton().onclick = function(){submit()};
function submit(){
  DOM.resultsDiv.innerHTML = 'Results:';
  if(!currentInfo.excelFile){
    alert('Please enter a valid output file');
    return false;
  }
  if(!savedAddresses.isLocation('HOME')){
    alert('Please enter a home location');
    return false;
  }
  currentInfo.date = DOM.getDateElement().value;
  var inputElements = DOM.getInputElements()
  var locations = []
  var j = 0;
  for(let i = inputElements.length - 1; i > -1; i--){ //iterate array in reverse to save addresses before looking at locations
    if(inputElements[i].className == "" || inputElements[i].className == 'home'){
      if(savedAddresses.isLocation(inputElements[i].value)){
        locations[j] = inputElements[i].value
        j++
      }else{
        alert('Please enter the address for ' + inputElements[i].value)
        return false
      }
    }else{
      let address = inputElements[i].value;
      let location = inputElements[i - 1].value;
      savedAddresses.saveAddress(location, address)
      savedAddresses.locationsDict[location] = address;
      DOM.resultsDiv.innerHTML += '<br>Saved ' + location;
    }
  }
  locations.reverse();
  currentInfo.locations = locations;
  var addresses = [];
  for(let i = 0; i < locations.length; i++){
    addresses[i] = savedAddresses.locationsDict[locations[i]];
  }
  DOM.resultsDiv.innerHTML += '<br>Converted locations to addresses';
  mapquest.calculateMileage(addresses)
  DOM.resetInputForm()
  if(savedAddresses.isLocation('HOME')) DOM.setHomeInputs()
  DOM.getDateElement().focus()
  return false; //stop the form from attemping to send data somewhere and reloading page
}
