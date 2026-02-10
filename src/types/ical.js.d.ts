declare module 'ical.js' {
    export class Component {
        constructor(jcal: any);
        getAllSubcomponents(name: string): Component[];
        getFirstPropertyValue(name: string): any;
    }

    export class Event {
        constructor(component: Component | null);
        summary: string;
        startDate: Time;
        endDate: Time;
        description: string;
        location: string;
    }

    export class Time {
        toJSDate(): Date;
    }

    export function parse(input: string): any;
}
