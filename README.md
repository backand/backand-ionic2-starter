# Backand Ionic 2 Starter

## Running the app 

Create an Ionic app:

    ionic start myApp https://github.com/backand/backand-ionic2-starter --v2
    cd myApp

Run the app
    
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