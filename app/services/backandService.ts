/**
 * Created by backand on 3/23/16.
 */

import 'rxjs/Rx'
import {Http, Headers, HTTP_BINDINGS} from '@angular/http'
import {Injectable} from '@angular/core';

@Injectable()
export class BackandService {


    api_url:string = 'https://api.backand.com';
    urls:{ 
        signup:string, 
        token:string, 
        requestResetPassword: string,
        resetPassword: string,
        changePassword: string,
        socialLoginWithCode: string,
        socialSignupWithCode: string,
        socialLoginWithToken: string
    } = {
        signup: '/1/user/signup',
        token: '/token',
        requestResetPassword: '/1/user/requestResetPassword',
        resetPassword: '/1/user/resetPassword',
        changePassword: '/1/user/changePassword',
        socialLoginWithCode: '/1/user/PROVIDER/code',
        socialSignupWithCode: '/1/user/PROVIDER/signupCode',
        socialLoginWithToken: '/1/user/PROVIDER/token'
    };
    
    app_name:string = 'your app name';
    signUpToken: string = 'your signup token';
    anonymousToken: string = 'your anonymousToken token';
    auth_status:string = '';
    auth_type:string;
    is_auth_error:boolean = false;
    auth_token:{ header_name : string, header_value: string};
    username: string;

    constructor(public http:Http) {
        let storedToken = localStorage.getItem('auth_token');
        if (storedToken){
            this.auth_token = JSON.parse(storedToken);
            this.auth_type = this.auth_token.header_name == 'Anonymous' ? 'Anonymous' : 'Token';
            this.auth_status = 'OK';
            if (this.auth_type == 'Token'){
                this.username = localStorage.getItem('username');
            }
        }    
        else{
            this.auth_token = {header_name: '', header_value: ''};
        }
    }

    public getAuthType():string {
        return this.auth_type;
    }

    public getAuthStatus():string {
        return this.auth_status;
    }

    public getUsername():string {
        return this.username;
    }

    public getAuthTokenSimple(username, password) {
        
        let creds = `username=${username}` +
            `&password=${password}` +
            `&appName=${this.app_name}` +
            `&grant_type=password`;
        console.log(creds);
        let header = new Headers();
        header.append('Content-Type', 'application/x-www-form-urlencoded');
        let url = this.api_url + this.urls.token;
        var $obs = this.http.post(url, creds, {
                headers: header
            })
            .map(res => this.getToken(res));


          $obs.subscribe(
                data => {
                    this.setTokenHeader(data)
                    localStorage.setItem('username', username);
                },
                err => {
                    console.log(err);
                },
                () => console.log('Finish Auth'));

          return $obs;
           
    }

    public clearAuthTokenSimple() {
        this.auth_token = {header_name: '', header_value: ''};
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
    }

    public signUp(email, password, confirmPassword, firstName, lastName) {
        let creds = {
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
                confirmPassword: confirmPassword
        };
        let header = new Headers();
        header.append('SignUpToken', this.signUpToken);
        var $obs = this.http.post(this.api_url + this.urls.signup, creds,
            {
                headers: header
            }
        );

        $obs.subscribe(
            data => {
                console.log(data);
            },
            err => {
                console.log(err);  
            },
            () => console.log('Finish Sign Up'));

        return $obs;
    }

    public changePassword(oldPassword, newPassword) {
        let creds = {
                oldPassword: oldPassword,
                newPassword: newPassword
        };
        var $obs = this.http.post(this.api_url + this.urls.changePassword, creds,
            {
                headers: this.authHeader
            }
        ).map(res => {
            // this.getToken(res);
            console.log(res);
        });


        $obs.subscribe(
            data => {
                // this.setTokenHeader(data)
                console.log(data);
            },
            err => {
              console.log(err);  
            },
            () => console.log('Finish Change Password'));

        return $obs;
    }

    public extractErrorMessage(err) {
        return JSON.parse(err._body).error_description;
    }

    public requestResetPassword(email) {
        let creds = {
            email: email,
            appName: this.app_name
        };
        let header = new Headers();
        header.append('SignUpToken', this.signUpToken);
        var $obs = this.http.post(this.urls.requestResetPassword, creds,
            {
                headers: header
            }
        ).map(res => {
            // this.getToken(res);
            console.log(res);
        });


        $obs.subscribe(
            data => {
                // this.setTokenHeader(data)
                console.log(data);
            },
            err => {
              console.log(err);  
            },
            () => console.log('Finish Request Reset Password'));

        return $obs;
    }

    public resetPassword(newPassword, resetToken) {
        let creds = {
            newPassword: newPassword,
            resetToken: resetToken
        };
        let header = new Headers();
        header.append('SignUpToken', this.signUpToken);
        var $obs = this.http.post(this.urls.resetPassword, creds,
            {
                headers: header
            }
        ).map(res => {
            // this.getToken(res);
            console.log(res);
        });

        $obs.subscribe(
            data => {
                // this.setTokenHeader(data)
                console.log(data);
            },
            err => {
              console.log(err);  
            },
            () => console.log('Finish Reset Password'));

        return $obs;
    }

    public useAnoymousAuth() {      
        this.setAnonymousHeader();
    }

    private setTokenHeader(jwt) {
        if (jwt) {
            this.auth_token.header_name = "Authorization";
            this.auth_token.header_value = "Bearer " + jwt;
            this.storeAuthToken(this.auth_token);
        }
    }

    public setAnonymousHeader() {
        this.auth_status = "OK";
        this.auth_token.header_name = "AnonymousToken";
        this.auth_token.header_value = this.anonymousToken;
        this.storeAuthToken(this.auth_token);
        localStorage.setItem('username', 'Anonymous');
    }

    private storeAuthToken(token) {
        localStorage.setItem('auth_token', JSON.stringify(token));
    }

    private getToken(res) {
        console.log(res);
        return res.json().access_token;
    }

    private get authHeader() {
        var authHeader = new Headers();
        authHeader.append(this.auth_token.header_name, this.auth_token.header_value);
        return authHeader;
    }

    public postItem(name, description) {
        let data = JSON.stringify({ name: name, description: description });

        return this.http.post(this.api_url + '/1/objects/todo?returnObject=true', data,
            {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json());           
    }

    public getItems() {
        return this.http.get(this.api_url + '/1/objects/todo?returnObject=true', {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json().data);
    }

    public filterItems(query) {
        let filter = 
            [
              {
                fieldName: 'name',
                operator: 'contains',
                value: query
              }
            ]
        ;

        return this.http.get(this.api_url + '/1/objects/todo?filter=' + encodeURI(JSON.stringify(filter)), 
            {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json().data);
    }

    public logError(err) {
        console.error('Error: ' + err);
    }
}