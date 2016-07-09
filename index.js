'use strict';
const {app} = require('electron')
const {BrowserWindow} = require('electron')


app.on('ready', () => {
  let mainWindow = new BrowserWindow({
  	frame: false
  })
  mainWindow.maximize()
  mainWindow.loadURL('file://' + __dirname + '/index.html')
})
