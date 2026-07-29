import { Person } from "./Person";

export class Kommentar {
    id!: string;
    beitragId!: string;
    elternKommentarId?: string | null;
    text!: string;
    autor!: Person;
    datum!: Date;
    likes?: Person[];
    likes_num!: number;
}
