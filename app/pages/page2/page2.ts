import {Component} from '@angular/core';
import 'rxjs/Rx'
import {Http, Headers, HTTP_BINDINGS} from '@angular/http'
import {BackandService} from '../../services/backandService'

@Component({
  templateUrl: 'build/pages/page2/page2.html'
})
export class Page2 {

  email:string = '';
  firstName:string = '';
  lastName:string = '';
  signUpPassword: string = '';
  confirmPassword: string = '';

  constructor(private backandService:BackandService) {


  }

  public signUp() {
    console.log('signUp');
    if (this.signUpPassword != this.confirmPassword){
      alert('Passwords should match');
      return;
    }
    var $obs = this.backandService.signUp(this.email, this.signUpPassword, this.confirmPassword, this.firstName, this.lastName);
    $obs.subscribe(                
      data => {
          alert('Sign up succeeded');
          this.email = this.signUpPassword = this.confirmPassword = this.firstName = this.lastName = '';
      },
      err => {
          this.backandService.logError(err)
      },
      () => console.log('Finish Auth'));
  }

  public socialSignin(provider) {
    var $obs = this.backandService.socialAuth(provider, true);
    $obs.subscribe(                
        data => {
            console.log('Sign up succeeded with:' + provider);           
        },
        err => {
            this.backandService.logError(err)
        },
        () => console.log('Finish Auth'));
  }
}