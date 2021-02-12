import type { Doctype } from '@ceramicnetwork/common'
import type Ceramic from '@ceramicnetwork/http-client'
import type { IDX } from '@ceramicstudio/idx'
import { useCallback, useReducer } from 'react'

import { schemas } from './config.json'
import { getIDX } from './idx'
import type { IDXInit, NotesList } from './idx'

type AuthStatus = 'pending' | 'loading' | 'failed'
export type DraftStatus = 'unsaved' | 'saving' | 'failed' | 'saved'
type NoteLoadingStatus = 'init' | 'loading' | 'loading'
type NoteSavingStatus = 'loaded' | 'saving' | 'saving failed' | 'saved'

type UnauthenticatedState = { status: AuthStatus }
type AuthenticatedState = { status: 'done'; ceramic: Ceramic; idx: IDX }
export type AuthState = UnauthenticatedState | AuthenticatedState

type NavDefaultState = { type: 'default' }
type NavDraftState = { type: 'draft' }
type NavNoteState = { type: 'note'; docID: string }

export type IndexLoadedNote = { status: NoteLoadingStatus; title: string }
export type StoredNote = {
  status: NoteSavingStatus
  title: string
  doc: Doctype
}

type Store = {
  draftStatus: DraftStatus
  notes: Record<string, IndexLoadedNote | StoredNote>
}
type DefaultState = {
  auth: AuthState
  nav: NavDefaultState
}
type NoteState = {
  auth: AuthenticatedState
  nav: NavDraftState | NavNoteState
}
export type State = Store & (DefaultState | NoteState)

type AuthAction = { type: 'auth'; status: AuthStatus }
type AuthSuccessAction = { type: 'auth success' } & IDXInit
type NavResetAction = { type: 'nav reset' }
type NavDraftAction = { type: 'nav draft' }
type NavNoteAction = { type: 'nav note'; docID: string }
type DraftDeleteAction = { type: 'draft delete' }
type DraftStatusAction = { type: 'draft status'; status: 'saving' | 'failed' }
type DraftSaveAction = {
  type: 'draft saved'
  title: string
  docID: string
  doc: Doctype
}
type NoteLoadedAction = { type: 'note loaded'; docID: string; doc: Doctype }
type NoteLoadingStatusAction = {
  type: 'note loading status'
  docID: string
  status: NoteLoadingStatus
}
type NoteSavingStatusAction = {
  type: 'note saving status'
  docID: string
  status: NoteSavingStatus
}
type Action =
  | AuthAction
  | AuthSuccessAction
  | NavResetAction
  | NavDraftAction
  | NavNoteAction
  | DraftDeleteAction
  | DraftStatusAction
  | DraftSaveAction
  | NoteLoadedAction
  | NoteLoadingStatusAction
  | NoteSavingStatusAction

  function reducer(state: State, action: Action): State {
    switch (action.type) {
      case 'auth':
        return {
          ...state,
          nav: { type: 'default' },
          auth: { status: action.status }
        }
      case 'auth success': {
        const auth = {
          status: 'done',
          ceramic: action.ceramic,
          idx: action.idx,
        } as AuthenticatedState
        return action.notes.length
          ? {
              ...state,
              auth,
              notes: action.notes.reduce((acc, item) => {
                acc[item.id] = { status: 'init', title: item.title }
                return acc
              }, {} as Record<string, IndexLoadedNote>),
            }
          : {
            auth,
            draftStatus: 'unsaved',
            nav: { type: 'draft' },
            notes: {},
          }
      }
      case 'nav reset':
        return { ...state, nav: { type: 'default' } }
      case 'nav draft':
        return {
          ...state,
          auth: state.auth as AuthenticatedState,
          nav: { type: 'draft' },
        }
      case 'draft status':
        return {
          ...state,
          auth: state.auth as AuthenticatedState,
          draftStatus: action.status,
        }
      case 'draft delete':
        return {
          ...state,
          draftStatus: 'unsaved',
          nav: { type: 'default' },
        }
      case 'draft saved': {
        return {
          auth: state.auth as AuthenticatedState,
          draftStatus: 'unsaved',
          nav: { type: 'note', docID: action.docID },
          notes: {
            ...state.notes,
            [action.docID]: {
              status: 'saved',
              title: action.title,
              doc: action.doc,
            },
          },
        }
      }
      case 'nav note':
        return {
          ...state,
          auth: state.auth as AuthenticatedState,
          nav: {
            type: 'note',
            docID: action.docID,
          },
        }
      case 'note loaded': {
        const id = (state.nav as NavNoteState).docID
        const noteState = state.notes[id]
        return {
          ...state,
          auth: state.auth as AuthenticatedState,
          notes: {
            ...state.notes,
            [id]: {
              status: 'loaded',
              title: noteState.title,
              doc: action.doc,
            },
          },
        }
      }
      case 'note loading status': {
        const id = (state.nav as NavNoteState).docID
        const noteState = state.notes[id] as IndexLoadedNote
        return {
          ...state,
          auth: state.auth as AuthenticatedState,
          notes: {
            ...state.notes,
            [id]: { ...noteState, status: action.status },
          },
        }
      }
      case 'note saving status': {
        const id = (state.nav as NavNoteState).docID
        const noteState = state.notes[id] as StoredNote
        return {
          ...state,
          auth: state.auth as AuthenticatedState,
          notes: {
            ...state.notes,
            [id]: { ...noteState, status: action.status },
          },
        }
      }
    }
  }
