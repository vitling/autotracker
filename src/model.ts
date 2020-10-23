type Note = {
    note: number | "---" | 'cont',
    fx?: {
        pulseWidth?: number,
        glide?: number
    },
    vel?: number
}
type Drum = {
    drum: "---" | 'KCK' | 'NSS' | 'SNR'
    vel?: number
}

type Slot = Note | Drum

type Pattern<T> = T[];

type Key = number & {"keyType": true}

type Progression = number[];
type Scale = number[];