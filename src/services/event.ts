export interface IEventPublisher {
    Publish(event: string, data: any): void;
    Consume(event: string, consumer: (data: any) => void): void;
}

export class DefaultEventService implements IEventPublisher {
    element: any;

    constructor(element: any) {
        this.element = element || window;
    }

    Publish(event: string, data: any): void {
        this.element.dispatchEvent(new CustomEvent(event, {
            detail: data,
            bubbles: true,
            cancelable: true
        }));
    }

    Consume(event: string, consumer: (data: any) => void): void {
        this.element.addEventListener(event, consumer);
    }
}