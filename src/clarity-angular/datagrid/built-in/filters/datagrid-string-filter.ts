/*
 * Copyright (c) 2016 VMware, Inc. All Rights Reserved.
 * This software is released under MIT license.
 * The full license information can be found in LICENSE in the root directory of this project.
 */
import {
    Component, Input, ViewChild, ElementRef, Renderer, AfterViewInit, EventEmitter, Output
} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";
import {Filter} from "../../interfaces/filter";
import {StringFilter} from "../../interfaces/string-filter";
import {CustomFilter} from "../../providers/custom-filter";
import {DatagridFilter} from "../../datagrid-filter";

@Component({
    selector: "clr-dg-string-filter",
    providers: [{provide: CustomFilter, useExisting: DatagridStringFilter}],
    template: `
        <clr-dg-filter [(clrDgFilterOpen)]="open">
            <!--
                Even though this *ngIf looks useless because the filter container already has one,
                it prevents NgControlStatus and other directives automatically added by Angular
                on inputs with NgModel from freaking out because of their host binding changing
                mid-change detection when the input is destroyed.
            -->
            <input #input type="text" name="search" [(ngModel)]="value" *ngIf="open"
                (keyup.enter)="close()" (keyup.escape)="close()"/>
        </clr-dg-filter>
    `
})
export class DatagridStringFilter implements CustomFilter, Filter<any>, AfterViewInit {

    constructor(private renderer: Renderer) {}

    /**
     * Customizable filter logic based on a search text
     */
    @Input("clrDgStringFilter") public filter: StringFilter<any>;

    /**
     * Indicates if the filter dropdown is open
     */
    public open: boolean = false;

    /**
     * We need the actual input element to automatically focus on it
     */
    @ViewChild("input") public input: ElementRef;

    /**
     * We grab the DatagridFilter we wrap to register this StringFilter to it.
     */
    @ViewChild(DatagridFilter) public filterContainer: DatagridFilter;
    ngAfterViewInit() {
        this.filterContainer.filter = this;

        this.filterContainer.openChanged.subscribe((open: boolean) => {
            if (open) {
                // We need the timeout because at the time this executes, the input isn't
                // displayed yet.
                setTimeout(() => {
                    this.renderer.invokeElementMethod(this.input.nativeElement, "focus");
                });
            }
        });

        if (this.value) { // this._changes needs a kick when a pre-filter value is supplied.
            this._changes.next(this.value);
        }
    }

    /**
     * The Observable required as part of the Filter interface
     */
    private _changes = new Subject<string>();
    // We do not want to expose the Subject itself, but the Observable which is read-only
    public get changes(): Observable<string> {
        return this._changes.asObservable();
    };

    /**
     * Raw input value
     */
    private _rawValue: string = "";
    public get value(): string {
        return this._rawValue;
    }
    /**
     * Input value converted to lowercase
     */
    private _lowerCaseValue: string = "";
    public get lowerCaseValue() {
        return this._lowerCaseValue;
    }
    /**
     * Common setter for the input value
     */
    @Input("clrFilterValue")
    public set value(value: string) {
        if (!value) {
            value = "";
        }
        if (value !== this._rawValue) {
            this._rawValue = value;
            this._lowerCaseValue = value.toLowerCase().trim();
            this._changes.next(value);
            this.filterValueChange.emit(value);
        }
    }

    @Output("clrFilterValueChange") filterValueChange = new EventEmitter();

    /**
     * Indicates if the filter is currently active, meaning the input is not empty
     */
    public isActive(): boolean {
        return !!this.value;
    }

    /**
     * Tests if an item matches a search text
     */
    public accepts(item: any): boolean {
        // We always test with the lowercase value of the input, to stay case insensitive
        return this.filter.accepts(item, this.lowerCaseValue);
    };

    public close() {
        this.open = false;
    }
}