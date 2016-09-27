import {Component} from '@angular/core';
import {Platform, ionicBootstrap} from 'ionic-angular';
import {StatusBar} from 'ionic-native';
import {TabsPage} from './pages/tabs/tabs';
import {BackandService} from './services/backandService'


@Component({
  template: '<ion-nav [root]="rootPage"></ion-nav>'
})
export class MyApp {

  private rootPage:any;

  constructor(private platform:Platform, private backandService:BackandService) {
    this.rootPage = TabsPage;

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      backandService.setIsMobile(platform.is('mobile'));
      backandService.setAppName('your app name'');
      backandService.setSignUpToken('your signup token');
      backandService.setAnonymousToken('your anonymousToken token');
    });
  }
}

ionicBootstrap(MyApp, [BackandService])
