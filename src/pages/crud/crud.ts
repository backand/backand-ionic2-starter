import {Component} from '@angular/core';
import {BackandService} from '../../providers/backandService'

@Component({
  templateUrl: 'crud.html',
  selector: 'page-crud'
})
export class CrudPage {
	name:string = 'World';
    description:string = 'Wonderful';
    public items:any[] = [];
    searchQuery: string;

    constructor(public backandService:BackandService) {   
        this.searchQuery = '';
      
        this.backandService.on("items_updated")
            .subscribe(
                data => {
                    console.log("items_updated", data);
                    let a = data as any[];
                    let newItem = {};
                    a.forEach((kv)=> newItem[kv.Key] = kv.Value);
                    this.items.unshift(newItem);
                },
                err => {
                    console.log(err);
                },
                () => console.log('received update from socket')
        );

    }

    public postItem() {
        
        this.backandService.create('todo', { name: this.name, description: this.description }).subscribe(
                data => {
                    // add to beginning of array
                    this.items.unshift({ id: null, name: this.name, description: this.description });
                    console.log(this.items);
                    this.name = '';
                    this.description = '';
                },
                err => this.backandService.logError(err),
                () => console.log('OK')
            );
    }

    public getItems() {
       this.backandService.getList('todo')
            .subscribe(
                data => {
                    console.log(data);
                    this.items = data;
                },
                err => this.backandService.logError(err),
                () => console.log('OK')
            );
    }

    public filterItems(searchbar) {
        // set q to the value of the searchbar
        var q = searchbar;

        // if the value is an empty string don't filter the items
        if (!q || q.trim() == '') {
          return;
        }
        else{
            q = q.trim();
        }

        let filter = 
            [
              {
                fieldName: 'name',
                operator: 'contains',
                value: q
              }
            ]
        ;


        this.backandService.getList('todo', null, null, filter)
            .subscribe(
                data => {
                    console.log("subscribe", data);
                    this.items = data;
                },
                err => this.backandService.logError(err),
                () => console.log('OK')
            );
    }

}
