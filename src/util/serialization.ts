export function Serialize(obj: any): string {
    return JSON.stringify(obj);
}

export function Deserialize<T>(obj: string): T {
    return JSON.parse(obj) as T;
}