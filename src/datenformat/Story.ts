import { Person } from "./Person";

export interface Story {
    id: string;
    link: string;
    titel: string;
    datum: Date;
    expiresAt: Date;
    autor: Person;
    zuschauer: Person[];
    angesehen: Person[];
}
