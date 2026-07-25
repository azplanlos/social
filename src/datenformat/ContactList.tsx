import { Person } from "./Person";

export interface ContactList {
    id?: string;
    name: string;
    owner?: Person;
    members: Person[];
}
