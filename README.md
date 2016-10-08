# Backand Ionic 2 Starter

Compatible with Ionic 2.0.0-rc.0

## Running the app 

1. Create an Ionic app:

    ionic start myApp https://github.com/backand/backand-ionic2-starter --v2
    cd myApp

2. Install Cordova Plugins

    ionic plugin add cordova-plugin-inappbrowser

3. Set details of your app in `src/app/app.component.ts`:

    backandService.setAppName('your app name');
    backandService.setSignUpToken('your signup token');
    backandService.setAnonymousToken('your anonymousToken token');

4. Install dependency:

    npm install socket.io-client --save

5. Run the app
    
    ionic serve

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

1. To subscribe to event `items_updated` from server side via sockets, in your component do, as in `src/app/pages/crud/crud.ts`:

      
      this.backandService.on('items_updated')
          .subscribe(
                data => {
                 
                },
                err => {
                    console.log(err);
                },
                () => console.log('received update from socket')
            );