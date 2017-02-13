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
    socketUrl: 'https://socket.backand.com',
    actionUrl: '/1/objects/action/'
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
import {Http, Headers, URLSearchParams} from '@angular/http'
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
    private socket: SocketIOClient.Socket;

    constructor(public http:Http) {
        if (this.setAuthenticationState()){
            this.loginSocket(this.auth_token.header_value, 
                this.anonymousToken, this.app_name);
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
        localStorage.setItem('app_name', appName);
    }

    public setAnonymousToken(anonymousToken) {
        this.anonymousToken = anonymousToken;
        localStorage.setItem('anonymousToken', anonymousToken);
    }

    public setSignUpToken(signUpToken) {
        this.signUpToken = signUpToken;
        localStorage.setItem('signUpToken', signUpToken);
    }

     
    // methods
    public signin(username, password): Observable<any> {       
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
            .map(res => res.json());

          $obs.subscribe(
                data => {
                    this.setTokenHeader(data.access_token)
                    localStorage.setItem('username', username);
                    localStorage.setItem('user', JSON.stringify(data));
                    this.setAuthenticationState();
                    this.loginSocket(data, this.anonymousToken, this.app_name);
                },
                err => {
                    console.log(err);
                },
                () => console.log('Finish Auth'));

          return $obs;
           
    }


    private signinWithToken(userData): Observable<any> {
        let creds = `accessToken=${userData.access_token}` +
            `&appName=${this.app_name}` +
            `&grant_type=password`;
        let header = new Headers();
        header.append('Content-Type', 'application/x-www-form-urlencoded');
        let url = this.api_url + URLS.token;
        var $obs = this.http.post(url, creds, {
                headers: header
            })
            .map(res => res.json());


          $obs.subscribe(
                data => {
                    this.setTokenHeader(data.access_token);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('user', data);
                    this.loginSocket(data, this.anonymousToken, this.app_name);
                    this.statusLogin.next(EVENTS.SIGNUP);   
                },
                err => {
                    this.statusLogin.error(err);
                },
                () => console.log('Finish Auth'));

          return $obs;
           
    }

    public signout() {
        this.auth_token = {header_name: '', header_value: ''};
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        localStorage.removeItem('user');
        this.setAuthenticationState();
    }

    public signup(email, password, confirmPassword, firstName, lastName): Observable<any> {
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

    public changePassword(oldPassword, newPassword): Observable<any> {
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

    public requestResetPassword(userName: string) { 
        let header = new Headers();
        header.append('Content-Type', 'application/x-www-form-urlencoded');
        let data = { 
            appName: this.app_name, 
            username: userName
        };
        return this.http.post(this.api_url + URLS.requestResetPassword, data, 
            {
                headers: header
            }
        );
    }

    public resetPassword(newPassword, resetToken) {
        let header = new Headers();
        header.append('Content-Type', 'application/x-www-form-urlencoded');
        let data = {
            newPassword: newPassword,
            resetToken: resetToken
        };
        return this.http.post(this.api_url +  URLS.resetPassword, data, 
            {
                headers: header
            }
        );
    }


    private socialSigninWithToken(provider, token): Observable<any> {

        let url = this.api_url + URLS.socialLoginWithToken.replace('PROVIDER', provider) + 
            "?accessToken=" + encodeURIComponent(token) + 
            "&appName=" + encodeURI(this.app_name) + 
            "&signupIfNotSignedIn=" + (this.callSignupOnSingInSocialError ? "true" : "false");

        this.signout();
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

    public socialSignin(provider: string, spec: any = null, email: string = null) {
        return this.socialAuth(provider, false, spec, email);
    }

    public socialSignup(provider: string, spec: any = null, email: string = null) {
        return this.socialAuth(provider, true, spec, email);
    }

    private socialAuth(provider: string, isSignUp: boolean, spec: any = null, email: string = null) 
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
                + '&returnAddress=' + this.dummyReturnAddress
                + "&signupIfNotSignedIn=" + (this.callSignupOnSingInSocialError ? "true" : "false");                              
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
                + '&returnAddress='
                + "&signupIfNotSignedIn=" + (this.callSignupOnSingInSocialError ? "true" : "false");
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

    public create(object: string, item: any, deep: boolean = false, returnObject: boolean = false) {
        let data: string = JSON.stringify(item);
        let query: string = '';
        if (returnObject){
            query += 'returnObject=true';
        }
        if (deep){
            query += query ? '&deep = true' : 'deep=true';
        }


        return this.http.post(this.api_url + '/1/objects/' + object + (query ? '?' + query : ''), data,
            {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json());           
    }

    public update(object: string, id: string, item: any, deep: boolean = false, returnObject: boolean = false) {
        let data: string = JSON.stringify(item);
        let query: string = '';
        if (returnObject){
            query += 'returnObject=true';
        }
        if (deep){
            query += query ? '&deep = true' : 'deep=true';
        }


        return this.http.put(this.api_url + '/1/objects/' + object + '/' + id + (query ? '?' + query : ''), data,
            {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json());           
    }



    public getList(object: string, 
        pageSize: number = null, 
        pageNumber: number = null, 
        filter: any = null, 
        sort: any = null,
        deep: boolean = false, 
        search: string = null,
        exclude: string[] = null, 
        relatedObjects: boolean = false) {
        let query: string = '';
        let queryParams : string[] = [];

        if (deep){
            queryParams.push('deep=true');
        }
        if (relatedObjects){
            queryParams.push('relatedObjects=true');
        }
        if (exclude){
            queryParams.push(exclude.join(','));
        }
        if (pageSize){
            queryParams.push('pageSize=' + pageSize);
        }
        if (pageNumber){
            queryParams.push('pageNumber=' + pageNumber);
        }
        if (filter){
            queryParams.push('filter=' + encodeURI(JSON.stringify(filter)));
        }
        if (sort){
            queryParams.push('sort=' + encodeURI(JSON.stringify(sort)));
        }
        if (search){
            queryParams.push('search=' + search);
        }
        if (queryParams.length > 0){
            query = '?' + queryParams.join('&');
        }

        return this.http.get(this.api_url + '/1/objects/' + object + query, {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json().data);
    }

    public getOne(object: string, id: string, deep: boolean = false, exclude: string[] = null, level: number = null) {
        let query: string = '';
        let queryParams : string[] = [];

        if (deep){
            queryParams.push('deep=true');
        }
        if (exclude){
            queryParams.push(exclude.join(','));
        }
        if (level){
            queryParams.push('level=' + level);
        }
        if (queryParams.length > 0){
            query = '?' + queryParams.join(',');
        }

        return this.http.get(this.api_url + '/1/objects/' + object + '/' + id + query, {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json());
    }

    public delete(object: string, id: string) {
        let headers = this.authHeader;
        headers.append('Content-Type', 'application/json');  
        return this.http.delete(
            this.api_url + '/1/objects/' + object + '/' + id,
            {
                headers: headers
            }
        );   
    }

    public uploadFile(objectName: string, fileActionName: string, filename: string, filedata: string) {
        let headers = this.authHeader;
        headers.append('Content-Type', 'application/json');
        let data = JSON.stringify({
            'filename': filename,
            'filedata': filedata.substr(filedata.indexOf(',') + 1, filedata.length) //need to remove the file prefix type
        });
        return this.http.post(
            this.api_url + URLS.actionUrl +  objectName + '?name=' + fileActionName,
            data, 
            {
                headers: headers
            } 
        );
    }

    public deleteFile(objectName: string, fileActionName: string, filename: string) {
        let headers = this.authHeader;
        headers.append('Content-Type', 'application/json');  
        return this.http.delete(
            this.api_url + URLS.actionUrl +  objectName + '?name=' + fileActionName + "&filename=" + filename,
            {
                headers: headers
            }
        );   
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

    // user details
    public getUsername():string {
        return this.username;
    }

    public getUserDetails(force: boolean) {
        if (force){
            let $obs = this.http.get(this.api_url + '/api/account/profile', {
                headers: this.authHeader
            })
            .retry(3)
            .map(res => res.json());

            $obs.subscribe(
                data => {
                    localStorage.setItem('user', JSON.stringify(data));
                },
                err => {
                    console.log(err);
                },
                () => console.log('Got User Details'));

            return $obs;
        }
        else{
            let userDetails = localStorage.getItem('user');
            let promise = Promise.resolve(userDetails ? JSON.parse(userDetails) : null);
            let $obs = Observable.fromPromise(promise);
            return $obs;
        }

    }

    public getUserRole(): string {
        let userDetails = <any> localStorage.getItem('user');
        if (userDetails){
            return userDetails.role;
        }
        else{
            return null;
        }
    }

    private setAuthenticationState(): boolean {
        let storedToken = localStorage.getItem('auth_token');
        if (storedToken){
            this.auth_token = JSON.parse(storedToken);
            this.auth_type = this.auth_token.header_name == 'Anonymous' ? 'Anonymous' : 'Token';
            this.auth_status = 'OK';
            if (this.auth_type == 'Token'){
                this.username = localStorage.getItem('username');
            }
            this.app_name = localStorage.getItem('app_name');
            this.anonymousToken = localStorage.getItem('anonymousToken');
            return true;
        }    
        else{
            this.auth_token = {header_name: '', header_value: ''};
            return false;
        }
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

    public useAnonymousAuth() {      
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
        if (this.auth_token && this.auth_token.header_name && this.auth_token.header_value){
            authHeader.append(this.auth_token.header_name, this.auth_token.header_value);
        }
        return authHeader;
    }

    public logError(err) {
        console.error('Error: ' + err);
    }
}
