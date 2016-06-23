'use strict';

const locationsDiv = document.getElementById('locations')
document.addEventListener('keydown', event => {
  if(event.keyCode === 9){ //tab key
    var locationElements = Array.prototype.slice.call(locationsDiv.childNodes) //converts childNodes object list into an array
    if(locationElements.includes(document.activeElement)){ //if a location input has focus
      locationsDiv.appendChild(document.createElement('input'))
      locationsDiv.appendChild(document.createElement('br'))
    }
  }
})

const submitButton = document.getElementById('submit')
submitButton.onclick = function(){
  var date = document.getElementById('date').value;
  var locations = [];
  var j = 0;
  for(let i = 0; i < locationsDiv.childNodes.length; i++){
    if(locationsDiv.childNodes[i].tagName === 'INPUT'){
      locations[j] = locationsDiv.childNodes[i].value;
      j++;
    }
  }
  return false; //stop the form from attemping to send data somewhere and reloading page
}
