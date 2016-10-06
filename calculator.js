'use strict';

const request = require('request')
const fs = require('fs')
const xlsx = require('xlsx-style')
const fuzzy = require('fuzzy')
const ical = require('ical')
const flatpickr = require('flatpickr')


const DOM = {
  resultsDiv: document.getElementById('results'),

  getDateElement() { return document.getElementById('date') },

  getLocationsDiv() { return document.getElementById('locations') },

  getInputForm() { return document.getElementById('locationsForm') },

  getSubmitButton() { return document.getElementById('submit') },

  getEventsDiv() { return document.getElementById('events') },

  getInputElements() {
    let childArray = Array.prototype.slice.call(this.getLocationsDiv().childNodes) //converts childNodes object list into an array
    let inputElements = childArray.filter((element) => {
      if (element.tagName === 'INPUT') return true;
      return false;
    })
    return inputElements;
  },

  getLocationInputElements() {
    var locationInputElements = DOM.getInputElements().filter((element) => {
      if (element.className === "") return true;
      return false;
    })
    return locationInputElements;
  },

  setHomeInputs() {
    var settingsHome = document.getElementById('settingsHome');
    settingsHome.value = savedAddresses.locationsDict['HOME'];
    var inputNodes = this.getLocationsDiv().childNodes;
    for (var child = inputNodes[0]; child !== null; child = child.nextElementSibling) {
      if (child.className == 'home') {
        child.value = 'HOME';
      }
    }
  },

  createNewLocationInput(adjacentElement) {
    adjacentElement.insertAdjacentHTML('afterend', '<br><button class = "deleteInput">X</button><input><button class = "showAddress">A</button>')
    var deleteButtonList = document.getElementsByClassName('deleteInput')
    var newDeleteButton = deleteButtonList[deleteButtonList.length - 1];
    newDeleteButton.onclick = () => {
      if (this.getLocationInputElements().length === 1) return false;
      this.getLocationsDiv().removeChild(newDeleteButton.previousElementSibling) //br

      //removes the correct amount of elements depending on if there is an address input
      var i = 2;
      if (newDeleteButton.nextElementSibling.nextElementSibling.nextElementSibling.tagName === 'LABEL') i += 2;
      for (i; i > 0; i--) this.getLocationsDiv().removeChild(newDeleteButton.nextElementSibling);

      this.getLocationsDiv().removeChild(newDeleteButton)
    }
    var addressButtonList = document.getElementsByClassName('showAddress');
    var newAddressButton = addressButtonList[addressButtonList.length - 1];
    newAddressButton.onclick = () => {
      if (newAddressButton.nextElementSibling.tagName === 'LABEL') {
        for (let i = 2; i > 0; i--) this.getLocationsDiv().removeChild(newAddressButton.nextElementSibling);
      } else {
        if (document.getElementById('suggestionBox')) document.body.removeChild(document.getElementById('suggestionBox'));
        this.createNewAddressInput(newAddressButton);
        var location = newAddressButton.previousElementSibling.value;
        var addressInput = newAddressButton.nextElementSibling.nextElementSibling;
        if (savedAddresses.isLocation(location)) {
          addressInput.value = savedAddresses.locationsDict[location];
        }
      }
    }
    newDeleteButton.focus() //since this method runs before default tab actions occur, we must focus on the element before the one we want to actually be focused after a tab
    
  },

  createNewAddressInput(adjacentElement) {
    adjacentElement.insertAdjacentHTML('afterend', '<label>  Address: </label><input size = 50 class="address">')
  },

  displaySuggestions(suggestions) {
    if (!document.getElementById('suggestionBox')) {
      if (suggestions.length == 0) return false;
      var suggestionBox = document.createElement('div');
      suggestionBox.id = 'suggestionBox';
      suggestionBox.style.top = (25 + this.getLocationInputElements().length * 2).toString() + '%';
      document.body.appendChild(suggestionBox)
      for (let i = 0; i < suggestions.length; i++) {
        let suggestion = document.createElement('div');
        suggestion.innerHTML = (i + 1).toString() + '.  ' + suggestions[i];
        suggestion.className = 'suggestion';
        suggestionBox.appendChild(suggestion)
      }
    } else {
      var suggestionBox = document.getElementById('suggestionBox')
      if (suggestions.length == 0) document.body.removeChild(suggestionBox);
      var suggestionElements = document.getElementsByClassName('suggestion');
      while (suggestions.length != suggestionElements.length) {
        if (suggestions.length < suggestionElements.length) {
          suggestionBox.removeChild(suggestionBox.lastChild)
        } else {
          let newSuggestion = document.createElement('div');
          newSuggestion.className = 'suggestion';
          suggestionBox.appendChild(newSuggestion);
        }
      }
      for (let i = 0; i < suggestions.length; i++) {
        suggestionElements[i].innerHTML = (i + 1).toString() + '.  ' + suggestions[i];
      }
    }
  },

  resetInputForm() {
    this.getInputForm().innerHTML =
      "<label>Date: <input id = 'date'></label><br>" +
      "<label>Locations:</label><br>" +
      "<div id = 'locations'>" +
      "<input readonly class = 'home'>" +
      "<br><input readonly class = 'home'>" +
      "</div>" +
      "<br><input id = 'submit', type = 'submit'>";
    DOM.createNewLocationInput(DOM.getInputElements()[0]);
    this.getSubmitButton().onclick = function () { submit() };
  },

  resetCalendar() {
    this.getEventsDiv().innerHTML = "";
  },

  displayCalendarDay(day) {
    this.resetCalendar();
    if (!day) return false;
    for (let i = 0; i < day.length; i++) {
      this.getEventsDiv().innerHTML += "<br>Summary: " + day[i].summary + "<br>" + "Location: " + day[i].location + "<br>";
    }
    let date = (day[0].start.getMonth() + 1) + '-' + day[0].start.getDate();
    document.getElementById('datePicker').value = day[0].start.getFullYear() + '-' + date;
    this.getDateElement().value = date;
  }
}

const mileage = {
  //The object that interacts with the mapquest API and reports the mileage results
  excelFile: null,
  calendar: null,
  baseURL: 'http://www.mapquestapi.com/directions/v2/route?key=MkRTKx7DbBySjsya4hnVsQ0bxgQgnbSy',

  responseAmbiguitites(locations) {
    for (let i = 0; i < locations.length; i++) {
      if (!(locations[i].geocodeQualityCode.startsWith('P1') || locations[i].geocodeQualityCode.startsWith('L1'))) {
        DOM.resultsDiv.innerHTML += '<br>The exact location of address ' + (i + 1) + ' could not be accurately determined by mapquest.';
        console.log(locations[i].geocodeQualityCode);
        return true;
      }
    }
    return false;
  },

  calculateMileage(locations, addresses) {
    var url = this.baseURL + '&from=' + addresses[0];
    for (let i = 1; i < addresses.length; i++) url += '&to=' + addresses[i];
    url = url.replace('#', '%23'); //URI replacement of number sign to prevent errors
    request(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        var results = JSON.parse(body)
        if (results.info.statuscode === 0) {
          var returnedLocations = results.route.locations;
          if (this.responseAmbiguitites(returnedLocations)) return false;
          var miles = Math.round(results.route.distance)
          DOM.resultsDiv.innerHTML += '<br>Got response: ' + miles + ' miles';
          this.report(locations, miles);
        } else {
          DOM.resultsDiv.innerHTML += '<br>Recieved bad response from Mapquest.  Status code: ' + results.info.statuscode;
        }
      } else {
        DOM.resultsDiv.innerHTML += '<br>Internet Error.';
      }
    })
    DOM.resultsDiv.innerHTML += '<br>Queried Mapquest';
  },

  getLocationString(locationArray) {
    //remove home locations
    locationArray.shift()
    locationArray.pop()
    var locationString = "";
    for (let i = 0; i < locationArray.length; i++) locationString = locationString + locationArray[i] + ', ';
    locationString = locationString.slice(0, locationString.length - 2) //remove trailing comma
    return locationString;
  },

  report(locations, mileage) {
    let date = DOM.getDateElement().value;
    let locationString = this.getLocationString(locations);
    this.excelFile.writeInfo(date, locationString, mileage);
    DOM.resetInputForm();
    DOM.setHomeInputs();
    DOM.getDateElement().focus();
    DOM.displayCalendarDay(this.calendar.getNextDay());
  }
}

const savedAddresses = {
  addressFile: 'addresses.txt',
  locationsDict: {},
  locationsList: [],

  createFile() {
    try {
      let file = fs.statSync('addresses.txt')
    } catch (err) {
      if (err.code == 'ENOENT') fs.closeSync(fs.openSync('addresses.txt', 'w'))
    }
  },

  saveAddress(location, address) {
    if (this.isLocation(location)) {
      let file = fs.readFileSync(this.addressFile, 'utf8');
      let oldAddress = this.locationsDict[location];
      let regex = new RegExp(location + '::' + oldAddress, 'g');
      let result = file.replace(regex, location + '::' + address + '\n');
      fs.writeFileSync(this.addressFile, result, 'utf8')
    } else {
      fs.appendFileSync(this.addressFile, location + '::' + address + '\n')
    }
    this.locationsDict[location] = address;
  },

  generateLocations() {
    var addressFile = fs.readFileSync(this.addressFile),
      locationsDict = {},
      locationsList = [],
      startIndex = 0,
      endIndex = 0,
      offset = 0,
      i = 1;
    while ((startIndex !== -1) && (endIndex !== -1)) {
      endIndex = addressFile.indexOf('\n', offset);
      if (addressFile.toString('utf8', startIndex, endIndex).length > 0) {
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

  isLocation(location) {
    if (this.locationsDict[location]) return true;
    return false;
  }
}

const settingsFile = {
  file: 'settings.txt',

  createFile() {
    try {
      let file = fs.statSync('settings.txt')
    } catch (err) {
      if (err.code == 'ENOENT') fs.appendFileSync('settings.txt', 'Output file::\nCalendar file::\n');
    }
  },

  setFile(filetype, newFileName) {
    let fileString = fs.readFileSync(this.file, 'utf8');
    let regex = new RegExp(filetype + '::.*', 'g');
    let result = fileString.replace(regex, filetype + '::' + newFileName + '\n');
    fs.writeFileSync(this.file, result, 'utf8');
  },

  getFile(filetype) {
    let fileString = fs.readFileSync(this.file, 'utf8');
    let regex = new RegExp(filetype + '::.*', 'g');
    let result = regex.exec(fileString)[0].split('::')[1];
    return result;
  },

  updateSettings() {
    const settingsCalendar = document.getElementById('settingsCalendar');
    const settingsHome = document.getElementById('settingsHome');
    const settingsOutput = document.getElementById('settingsOutput');
    savedAddresses.saveAddress('HOME', settingsHome.value);
    DOM.setHomeInputs();
    fs.stat(settingsOutput.value, err => {
      if (err && err.code == 'ENOENT') { alert('Cannot find ' + settingsOutput.value) }
      else {
        settingsFile.setFile('Output file', settingsOutput.value)
        mileage.excelFile = new excel(settingsOutput.value)
        settingsFile.setFile('Calendar file', settingsCalendar.value)
      }
    })
  }
}

class excel {
  constructor(file) {
    this.file = file;
    this.workbook = xlsx.readFile(this.file, { cellNF: true, cellStyle: true })
    this.worksheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
  }

  findEmptyRow() {
    let range = this.worksheet['!ref'];
    let lastCell = range.split(':')[1];
    let lastRow = Number(lastCell.substring(1));
    return lastRow + 1;
  }

  writeInfo(date, locations, mileage) {
    let row = this.findEmptyRow();
    this.worksheet['!ref'] = 'A1:C' + row.toString();
    this.worksheet['A' + row.toString()] = { w: undefined, v: date, t: 's' };
    this.worksheet['B' + row.toString()] = { w: undefined, v: locations, t: 's' };
    this.worksheet['C' + row.toString()] = { w: undefined, v: mileage, t: 'n' };
    xlsx.writeFile(this.workbook, this.file, { cellDates: true });
    DOM.resultsDiv.innerHTML += '<br>Updated ' + this.file;
  }
}

class ics {
  constructor(file) {
    this.file = file;
    this.contents = ical.parseFile(file);
    this.organizedCalendar = this.organizeCalendar();
  }

  organizeCalendar() {
    var organizedCalendar = {}
    for (var k in this.contents) {
      if (this.contents.hasOwnProperty(k) && this.contents[k].hasOwnProperty('start')) {
        var ev = this.contents[k];
        var year = ev.start.getFullYear();
        var month = ev.start.getMonth();
        var date = ev.start.getDate();
        if (organizedCalendar[year]) {
          if (organizedCalendar[year][month]) {
            if (organizedCalendar[year][month][date]) {
              var day = organizedCalendar[year][month][date];
              for(var i = 0; i < day.length; i++) if(day[i].start.valueOf() > ev.start.valueOf()) break;
              day = day.splice(i, 0, ev);
            } else {
              organizedCalendar[year][month][date] = [ev];
            }
          } else {
            organizedCalendar[year][month] = {}
            organizedCalendar[year][month][date] = [ev];
          }
        } else {
          organizedCalendar[year] = {}
          organizedCalendar[year][month] = {}
          organizedCalendar[year][month][date] = [ev];
        }
      }
    }
    return organizedCalendar;
  }

  getDay(desiredDay, desiredMonth, desiredYear) {
    this.currentDay = desiredDay;
    if (this.organizedCalendar[desiredYear][desiredMonth][desiredDay]) {
      return this.organizedCalendar[desiredYear][desiredMonth][desiredDay];
    } else {
      return false;
    }
  }

  getNextDay() { 
    var date = document.getElementById('datePicker').value;
    if (!date) return false;
    var date = date.split('-');
    var year = Number(date[0]);
    var month = Number(date[1]) - 1;
    var day = Number(date[2]);
    while (!this.organizedCalendar[year][month][++day]) {
      if (day > 31) {
        day = 0;
        month++;
        if (month === 12) {
          month = 0;
          year++;
        }
      }
    }
    return (this.getDay(day, month, year));
  }

}


function initialize() {
  document.getElementById('settingsButton').onclick = settingsFile.updateSettings;
  settingsFile.createFile()
  savedAddresses.createFile()
  savedAddresses.generateLocations()

  if (savedAddresses.isLocation('HOME')) {
    DOM.setHomeInputs();
  } else {
    alert('You have no set home location.  Setting a home location will reduce ' +
      'the work you need to do.  To learn about home locations, please read the instructions, ' +
      'which you can access from the start page.  To set a home location, enter it into the box ' +
      'at the top of the page.');
  }

  var calendarFile = settingsFile.getFile('Calendar file');
  document.getElementById('settingsCalendar').value = calendarFile;
  var outputFile = settingsFile.getFile('Output file');
  document.getElementById('settingsOutput').value = outputFile;
  if (outputFile == "") {
    alert('Please enter an output file.  The output file must be an excel file with file extension .xlsx');
  } else {
    fs.stat(outputFile, (err) => {
      if (err && err.code == 'ENOENT') { alert('Your output file cannot be found') }
      else { mileage.excelFile = new excel(outputFile) }
    })
  }
  if (calendarFile != "") {
    fs.stat(calendarFile, (err) => {
      if (err && err.code == 'ENOENT') { alert('Your calendar file cannot be found') }
      else {
        mileage.calendar = new ics(calendarFile);
        var datePicker = flatpickr('#datePicker', {
          allowInput: true,
          onChange: function(dateObj, dateStr) {
            var dateArray = dateStr.split('-');
            DOM.displayCalendarDay(mileage.calendar.getDay(Number(dateArray[2]), Number(dateArray[1]) - 1, Number(dateArray[0])));
          },
          disable: [
            function(date) {
              var year = date.getFullYear();
              var month = date.getMonth();
              var day = date.getDate();
              return !mileage.calendar.getDay(day, month, year);
            }
          ]
        });
      }
    })
  }
  DOM.createNewLocationInput(DOM.getInputElements()[0]);
  DOM.getDateElement().focus();
}
setTimeout(initialize, 50) //wait 50ms so the document elements will render(window.onload does not work)

document.addEventListener('keydown', event => {
  var inputElements = DOM.getInputElements();
  if (inputElements.includes(document.activeElement)) {

    if (event.keyCode === 9) { //tab
      if (document.activeElement.className === 'address') {
        DOM.createNewLocationInput(document.activeElement);
      } else if(document.activeElement.className === ""){
        if (savedAddresses.isLocation(document.activeElement.value)) {
          if (document.activeElement.nextElementSibling.nextElementSibling.tagName !== 'LABEL') {
            DOM.createNewLocationInput(document.activeElement.nextElementSibling);
          } else {
            DOM.createNewLocationInput(document.activeElement.nextElementSibling.nextElementSibling.nextElementSibling);
          }
        } else {
          if(document.activeElement.nextElementSibling.nextElementSibling.tagName !== 'LABEL'){
            DOM.createNewAddressInput(document.activeElement.nextElementSibling);
            if (document.getElementById('suggestionBox')) document.body.removeChild(document.getElementById('suggestionBox'));
          }
        }
      } else if(document.activeElement.className === 'home') {
        document.activeElement.nextElementSibling.nextElementSibling.focus(); //focusing on element before the one wanted(delete button) so that when tab runs, it focuses on the right element
      }
    } else if (49 <= event.keyCode && event.keyCode <= 53 && event.ctrlKey && document.getElementById('suggestionBox')) { //49-57 are number keys 1-5
      let suggestions = document.getElementsByClassName('suggestion')
      let selection = event.keyCode - 49;
      let selectedSuggestion = suggestions[selection].innerHTML.slice(4);
      document.activeElement.value = selectedSuggestion;
      if (savedAddresses.isLocation(selectedSuggestion)) document.activeElement.style.color = 'green';
      document.body.removeChild(document.getElementById('suggestionBox'))
    }
  }
})

document.addEventListener('input', event => { //using input instead of keydown because input fires after the input element's value is updated
  var inputElements = DOM.getInputElements();
  if (inputElements.includes(document.activeElement) && document.activeElement.className == "") {
    var location = document.activeElement.value;
    if (savedAddresses.isLocation(location)) {
      document.activeElement.style.color = 'green';
      if (document.getElementById('suggestionBox')) {
        document.body.removeChild(document.getElementById('suggestionBox'));
      }
    } else {
      document.activeElement.style.color = 'red';
      var suggestions = fuzzy.filter(location, savedAddresses.locationsList);
      while (suggestions.length > 5) suggestions.pop()
      suggestions = suggestions.map((suggestion) => { return suggestion.string })
      DOM.displaySuggestions(suggestions)
    }
  }
})

DOM.getSubmitButton().onclick = function () { submit() };
function submit() {
  DOM.resultsDiv.innerHTML = 'Results:';
  if (!mileage.excelFile) {
    alert('Please enter a valid output file');
    return false;
  }
  if (!savedAddresses.isLocation('HOME')) {
    alert('Please enter a home location');
    return false;
  }
  var inputElements = DOM.getInputElements()
  var locations = []
  var j = 0;
  for (let i = inputElements.length - 1; i > -1; i--) { //iterate inputs array in reverse to save addresses before looking at locations
    if (inputElements[i].className == "" || inputElements[i].className == 'home') {
      if (savedAddresses.isLocation(inputElements[i].value)) {
        locations[j] = inputElements[i].value
        j++
      } else {
        alert('Please enter the address for ' + inputElements[i].value)
        return false
      }
    } else {
      let address = inputElements[i].value;
      if(address === "") continue;
      let location = inputElements[i - 1].value;
      savedAddresses.saveAddress(location, address)
      DOM.resultsDiv.innerHTML += '<br>Saved ' + location;
    }
  }
  locations.reverse();
  var addresses = [];
  for (let i = 0; i < locations.length; i++) addresses[i] = savedAddresses.locationsDict[locations[i]];
  DOM.resultsDiv.innerHTML += '<br>Converted locations to addresses';
  mileage.calculateMileage(locations, addresses);
}
