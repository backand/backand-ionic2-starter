/**
 * Created by backand on 3/23/16.
 */

export enum EVENTS {
    SIGNIN,
    SIGNOUT,
    SIGNUP
};

export const URLS = {
    signup: '/1/user/signup',
    token: '/token',
    requestResetPassword: '/1/user/requestResetPassword',
    resetPassword: '/1/user/resetPassword',
    changePassword: '/1/user/changePassword',
    socialLoginWithToken: '/1/user/PROVIDER/token',
    socketUrl: 'https://api.backand.com:4000'
}

export const ERRORS = {
    NO_EMAIL_SOCIAL_ERROR: 'NO_EMAIL_SOCIAL', 
    NOT_SIGNEDIN_ERROR: 'The user is not signed up to',
    ALREADY_SIGNEDUP_ERROR: 'The user already signed up to'
};

// get token or error message from url in social sign-in popup
(function () {
    var dataRegex = /\?(data|error)=(.+)/;
    var dataMatch = dataRegex.exec(location.href);
    if (dataMatch && dataMatch[1] && dataMatch[2]) {
        var userData = {};
        userData[dataMatch[1]] = JSON.parse(decodeURI(dataMatch[2].replace(/#.*/, '')));
        window.opener.postMessage(JSON.stringify(userData), location.origin);
    }
}());

import {Observable, BehaviorSubject, Subject} from 'rxjs';
import {Http, Headers, HTTP_BINDINGS, URLSearchParams} from '@angular/http'
import {Injectable} from '@angular/core';
import {Facebook} from 'ionic-native';
import * as io from 'socket.io-client';

@Injectable()
export class BackandService {

    private api_url: string = 'https://api.backand.com';  
    private socialProviders: any = {
        github: {name: 'github', label: 'Github', url: 'www.github.com', css: 'github', id: 1},
        google: {name: 'google', label: 'Google', url: 'www.google.com', css: 'google-plus', id: 2},
        facebook: {name: 'facebook', label: 'Facebook', url: 'www.facebook.com', css: 'facebook', id: 3},
        twitter: {name: 'twitter', label: 'Twitter', url: 'www.twitter.com', css: 'twitter', id: 4}
    }; 
    private dummyReturnAddress: string = 'http://www.backandkuku.com';
    
    // configuration variables
    private app_name:string = 'your app name';
    private signUpToken: string = 'your signup token';
    private anonymousToken: string = 'your anonymousToken token';
    private callSignupOnSingInSocialError: boolean = true;
    private isMobile: boolean = false;

    // authentication state
    private auth_status:string = "";
    private auth_type:string;
    private is_auth_error:boolean = false;
    private auth_token:{ header_name : string, header_value: string};
    private username: string;
    
    private socialAuthWindow: any;
    private statusLogin: Subject<EVENTS>;
    private socket: SocketIOClient.Socket;;


    constructor(public http:Http) {
        let storedToken = localStorage.getItem('auth_token');
        if (storedToken){
            this.auth_token = JSON.parse(storedToken);
            this.auth_type = this.auth_token.header_name == 'Anonymous' ? 'Anonymous' : 'Token';
            this.auth_status = 'OK';
            if (this.auth_type == 'Token'){
                this.username = localStorage.getItem('username');
            }
            this.loginSocket(this.auth_token.header_value, this.anonymousToken, this.app_name);
        }    
        else{
            this.auth_token = {header_name: '', header_value: ''};
        }
        
    }

    // configuration of SDK
    public setIsMobile(isMobile: boolean) {
        this.isMobile = isMobile;
    }

    public setRunSignupAfterErrorInSigninSocial(signUpOnSignIn: boolean) {
        this.callSignupOnSingInSocialError = signUpOnSignIn;
    }

    public setAppName(appName: string) {
        this.app_name = appName;
    }

    public setAnonymousToken(anonymousToken) {
        this.anonymousToken = anonymousToken;
        return this;
    }

    public setSignUpToken(signUpToken) {
        this.signUpToken = signUpToken;
        return this;
    }

     
    // methods
    public getAuthTokenSimple(username, password) {       
        let creds = `username=${username}` +
            `&password=${password}` +
            `&appName=${this.app_name}` +
            `&grant_type=password`;
        let header = new Headers();
        header.append('Content-Type', 'application/x-www-form-urlencoded');
        let url = this.api_url + URLS.token;
        var $obs = this.http.post(url, creds, {
                headers: header
            })
            .map(res => this.getToken(res));

          $obs.subscribe(
                data => {
                    this.setTokenHeader(data)
                    localStorage.setItem('username', username);
                    this.loginSocket(data, this.anonymousToken, this.app_name);
                },
                err => {
                    console.log(err);
                },
                () => console.log('Finish Auth'));

          return $obs;
           
    }


    public signinWithToken(userData) {
        let creds = `accessToken=${userData.access_token}` +
            `&appName=${this.app_name}` +
            `&grant_type=password`;
        let header = new Headers();
        header.append('Content-Type', 'application/x-www-form-urlencoded');
        let url = this.api_url + URLS.token;
        var $obs = this.http.post(url, creds, {
                headers: header
            })
            .map(res => this.getToken(res));


          $obs.subscribe(
                data => {
                    this.setTokenHeader(data)
                    localStorage.setItem('username', userData.username);
                    this.loginSocket(data, this.anonymousToken, this.app_name);
                    this.statusLogin.next(EVENTS.SIGNUP);   
                },
                err => {
                    this.statusLogin.error(err);
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
        var $obs = this.http.post(this.api_url + URLS.signup, creds,
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
        var $obs = this.http.post(this.api_url + URLS.changePassword, creds,
            {
                headers: this.authHeader
            }
        ).map(res => {
            console.log(res);
        });


        $obs.subscribe(
            data => {
                console.log(data);
            },
            err => {
              console.log(err);  
            },
            () => console.log('Finish Change Password'));

        return $obs;
    }

    public socialSigninWithToken(provider, token) {

        
        let url = this.api_url + URLS.socialLoginWithToken.replace('PROVIDER', provider) + "?accessToken=" + encodeURIComponent(token) + "&appName=" + encodeURI(this.app_name) + "&signupIfNotSignedIn=" + this.callSignupOnSingInSocialError ? "true" : "false";
        this.clearAuthTokenSimple();
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        let $obs = this.http.get(url, 
            {
                headers: headers    
            }
        )
        .map(res => res.json());
        
        $obs.subscribe(
            data => {            
                this.setTokenHeader(data.access_token);
                localStorage.setItem('user', data);
                this.loginSocket(data.access_token, this.anonymousToken, this.app_name);
                this.statusLogin.next(EVENTS.SIGNUP);   
            },
            err => {
                this.logError(err);
                this.statusLogin.error(err);
            },
            () => { }
        );

        return $obs;

    } 

    public socialAuth(provider: string, isSignUp: boolean, spec: any = null, email: string = null) 
    {
        if (!this.statusLogin){
            this.statusLogin = new Subject<EVENTS>();
        }
        
        if (!this.socialProviders[provider]) {
            throw Error('Unknown Social Provider');
        }
        
        if (this.isMobile) {                
            let windowUrl = this.api_url + '/1/'
                + this.getSocialUrl(provider, isSignUp)
                + '&appname=' + this.app_name + (email ? ("&email=" + email) : '')
                + '&returnAddress=' + this.dummyReturnAddress;                              
            this.socialAuthWindow = window.open(
                windowUrl,
                spec || 'left=1, top=1, width=600, height=600');
                       
            let source = Observable.fromEvent(this.socialAuthWindow, 'loadstart')               
            source.subscribe((e: any) => {

                if (e.url.indexOf(this.dummyReturnAddress) == 0) { // mean startWith
                    
                    var url = e.url;
                    // handle case of misformatted json from server
                    if (url && url.indexOf('#_=_') > -1){
                       url = url.slice(0, url.lastIndexOf('#_=_')); 
                    }
                    
                    url = decodeURI(url);
                    let breakdown = this.parseQueryString(url);
                    
                    // error return from server
                    if (breakdown.error) {                              
                        if (!isSignUp && this.callSignupOnSingInSocialError && breakdown.error.message.indexOf(ERRORS.NOT_SIGNEDIN_ERROR) > -1) {  // check is right error
                            this.socialAuth(provider, true, spec);
                        }
                        if (breakdown.error.message.indexOf(ERRORS.ALREADY_SIGNEDUP_ERROR) > -1) {                            
                            this.statusLogin.error(breakdown.error.message + ' (signing in with ' + breakdown.error.provider + ')');
                        }
                    }
                    else{
                        // login is OK
                        let userData = breakdown.data;              
                        this.signinWithToken(userData);                        
                    }

                    try {
                        this.socialAuthWindow.close();
                    }
                    catch (err) {
                        console.log(err);
                    }
                }              
             });

 
        }
        else {

            let windowUrl =  this.api_url + '/1/'
                + this.getSocialUrl(provider, isSignUp)
                + '&appname=' + this.app_name + (email ? ("&email=" + email) : '')
                + '&returnAddress=';
            this.socialAuthWindow = window.open(windowUrl,
                'id1',
                spec || 'left=1, top=1, width=600, height=600'
               );
          
            let source = Observable.fromEvent(window, 'message');
            var subscription = source.subscribe((e: any) => {               

                // where does location come from ?
                if (e.target.location.origin !== location.origin) {
                    return;
                }
                let data = e.data;                

                // handle case of misformatted json from server   
                if (data && data.indexOf('#_=_') > -1){
                    data = data.slice(0, data.lastIndexOf('#_=_')); 
                }
                data = JSON.parse(data);
                let error = data.error;
                data = data.data;
                
                           
                if (error) {
                    if (this.callSignupOnSingInSocialError && error.message.indexOf(ERRORS.NOT_SIGNEDIN_ERROR) > -1) {  // check is right error
                        this.socialAuth(provider, true, spec);
                    }
                    if (isSignUp && error.message.indexOf(ERRORS.ALREADY_SIGNEDUP_ERROR) > -1) {                       
                        this.statusLogin.error(error.message + ' (signing in with ' + error.provider + ')');
                    }
                }
                else{                    
                    // login is OK                   
                    let userData = data;  
                    this.signinWithToken(userData);                   
                }
                e.target.removeEventListener('message');   
                this.socialAuthWindow.close();
                this.socialAuthWindow = null; 
            });
        } 
        return this.statusLogin;
    } 

    public inAppSocial(provider: string) {
        if (this.isMobile){
            let that: any = this;
            if (!this.statusLogin){
                this.statusLogin = new Subject<EVENTS>();
            }
            let permissions: string[] = ['public_profile', 'email'];
            Facebook.login(permissions).then( 
                function(data) {
                    console.log(data);
                    if (data.status.toLowerCase() == 'connected'){
                        let token: string = data.authResponse.accessToken;
                        that.socialSigninWithToken(provider, token); 
                    }
                    else{
                       that.statusLogin.error(data.status); 
                    }

                },
                function(err) {
                    console.log(err);
                    that.statusLogin.error(err);
                }
            );
            return this.statusLogin;
        }
        else{
            this.socialAuth(provider, true);
        }
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

    public loginSocket(token, anonymousToken, appName) {
    

        this.socket = io.connect(URLS.socketUrl, {'forceNew':true });

        this.socket.on('connect', () => {
            console.log('connected');
            this.socket.emit("login", token, anonymousToken, appName);
        });

        this.socket.on('disconnect', () => {
            console.log('disconnect');
        });

        this.socket.on('reconnecting', () => {
          console.log('reconnecting');
        });

        this.socket.on('error', (error: string) => {
          console.log('error: ${error}');
        });

    }

    public logoutSocket() {
        if (this.socket){
            this.socket.close();
        }
    }

    public on(eventName: string) {
        let socketStream = Observable.fromEvent(this.socket, eventName);
        return socketStream;
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

    private getSocialUrl(providerName: string, isSignup: boolean) {
        let provider = this.socialProviders[providerName];
        let action = isSignup ? 'up' : 'in';
        return 'user/socialSign' + action +
            '?provider=' + provider.label +
            '&response_type=token&client_id=self&redirect_uri=' + provider.url +
            '&state=';
    }

    private parseQueryString(queryString): any {
        let query = queryString.substr(queryString.indexOf('/?') + 2);
        let breakdown = {};
        let vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            breakdown[pair[0]] = JSON.parse(pair[1]);
        }
        return breakdown;
    }

    public extractErrorMessage(err) {
        return JSON.parse(err._body).error_description;
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

    private setAnonymousHeader() {
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
        return res.json().access_token;
    }

    private get authHeader() {
        var authHeader = new Headers();
        authHeader.append(this.auth_token.header_name, this.auth_token.header_value);
        return authHeader;
    }

    public logError(err) {
        console.error('Error: ' + err);
    }
}