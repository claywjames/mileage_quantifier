'use strict';
const {app} = require('electron')
const {BrowserWindow} = require('electron')


app.on('ready', () => {
  let mainWindow = new BrowserWindow({
    width: 900,
    height: 600
  })
  mainWindow.maximize()
  mainWindow.loadURL('file://' + __dirname + '/index.html')
})
