# Backand Ionic 2 Starter

## Running the app 

1. Create an Ionic app:

    ionic start myApp https://github.com/backand/backand-ionic2-starter --v2
    cd myApp

2. Install Cordova Plugins

    ionic plugin add cordova-plugin-inappbrowser

3. Run the app
    
    ionic serve

## Customize for Your App

In file, `app/services/backandService.ts`, in `BackandService`, set this local variables:

    
    app_name:string = 'your app name';
    signUpToken: string = 'your signup token';
    anonymousToken: string = 'your anonymousToken token';

## Setup of Platform

This is done in `app.ts`,  within `platform.ready()`,

* Are we on a mobile or desktop browser?

      let isMobile = platform.is('mobile');
      backandService.setIsMobile(isMobile);

* Do we call signup if we tried to sign in via a social networkm and 
 the user is not signed up for the app?

    backandService.setRunSignupAfterErrorInSigninSocial(true);

## CRUD

To fetch, create, and filter rows, from an object, say `stuff`, modify 
the `url` used in these functions:

    getItems
    filterItems
    postItem

replacing `todo` with the name of your object, `stuff`

## Social Signup 

The app opens a dialog supplied by the social network. 

## In App

### Facebook

Use the Facebook Connect plugin to obtain access to the native FB application on iOS and Android.

Install it with: 

    ionic plugin add cordova-plugin-facebook4 --save --variable APP_ID="<Facebook APP ID>" --variable APP_NAME="<Facebook APP NAME>"

Use `BackandService` function `inappSocial`

## Socket Service

1. Add to `package.json` the dependency, 
  
    "socket.io-client": "^1.4.8"
  
Add to `typings.json` the global dependencies:

    "node": "registry:dt/node#6.0.0+20160514165920",
    "socket.io-client": "registry:dt/socket.io-client#1.4.4+20160317120654"
   
2. Install dependencies

  npm install
  typings install
  
3. To login via socket call `BackandService.loginSocket`
    
4. To logout from socket call `BackandService.logoutSocket`

5. To subscribe to event `items_updated` from server side via sockets, 
call `BackandService.susbcribeSocket` and in your controller, subscribe with,

    this.backandService.subscribeSocket('items_updated')
      .subscribe(
            data => {
             
            },
            err => {
                console.log(err);
            },
            () => console.log('received update from socket')
        );