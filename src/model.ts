/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
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