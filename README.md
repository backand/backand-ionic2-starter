# Backand Ionic 2 Starter

## Running the app 

1. Create an Ionic app:

    ionic start myApp https://github.com/backand/backand-ionic2-starter
    cd myApp

2. Run the app
    
    ionic serve

## Customize for Your App

In file, `app/services/backandService.ts`, in `BackandService`, set this local variables:

    
    app_name:string = 'your app name';
    signUpToken: string = 'your signup token';
    anonymousToken: string = 'your anonymousToken token';

To fetch, create, and filter rows, from an object, say `stuff`, modify 
the `url` used in these functions:

    getItems
    filterItems
    postItem

replacing `todo` with the name of your object, `stuff`