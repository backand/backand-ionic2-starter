# Backand Ionic 2 Starter

## Customize for Your App

In file, `app/services/backandService.ts`, in `BackandService`, set this local variables:

    
    app_name:string = "appName";
    signUpToken: string = 'sssssss';
    anonymousToken: string = 'aaaaaaaa';

To fetch, create, and filter rows, from an object, `stuff`, replace in 
this file, the `url` used in this functions:

    getItems
    filterItems
    postItem

replacing `todo` with the name of your object, `stuff`.