/*
    Copyright (C) 2025 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplus-ts

*/

'use strict'

import { Logger } from 'winston';

import * as rpi from './interfaces/rustplus';
import * as rp from './rustplus';

/**
 * Validation Utils
 */

type ValidationError = { key: string; value: unknown; expected: unknown };

function getTypeOf(value: unknown): string {
    return value === null ? 'null' : typeof value;
}

function isType(value: unknown, ...types: (string | null | undefined)[]): boolean {
    return types.some(type =>
        (type === null && value === null) || (type === undefined && value === undefined) || (typeof value === type)
    );
}

function validateType(key: string, value: unknown, ...types: (string | null | undefined)[]):
    ValidationError | null {
    if (!isType(value, ...types)) {
        return { key: key, value: getTypeOf(value), expected: types }
    }
    return null;
}

function validateInterface(key: string, value: unknown, logger: Logger | null = null,
    validationCallback: (input: unknown, logger: Logger | null) => boolean): ValidationError | null {
    if (!validationCallback(value, logger)) {
        return { key: key, value: value, expected: 'unknown' }
    }

    return null;
}

function validateArrayOfInterfaces(key: string, value: unknown, logger: Logger | null = null,
    validationCallback: (input: unknown, logger: Logger | null) => boolean): ValidationError | null {
    if (!Array.isArray(value)) {
        return { key: key, value: getTypeOf(value), expected: 'Array of interfaces' };
    }

    const errors = value.map((item, index) => {
        const isValid = validationCallback(item, logger);
        return isValid ? null : 'Invalid';
    }).filter(error => error !== null) as string[];

    if (errors.length > 0) {
        return { key, value: 'unknown', expected: 'Array of interfaces' };
    }

    return null;
}

function validateArrayOfTypes(key: string, value: unknown, ...types: (string | null | undefined)[]):
    ValidationError | null {
    if (!Array.isArray(value)) {
        return { key: key, value: getTypeOf(value), expected: `Array of types ${types.join(', ')}` };
    }

    /* Loop through each element in the array and check if its type is in the allowed types */
    for (const item of value) {
        let isValid = false;
        for (const type of types) {
            if (isType(item, type)) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            /* If an invalid element is found, return the error */
            return { key: key, value: getTypeOf(item), expected: `Array of types ${types.join(', ')}` };
        }
    }

    return null;
}

function validateObjectOfInterfaces(key: string, value: unknown, logger: Logger | null = null,
    validationCallback: (input: unknown, logger: Logger | null) => boolean): ValidationError | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { key: key, value: getTypeOf(value), expected: 'Object of interfaces' };
    }

    for (const [objKey, objValue] of Object.entries(value)) {
        if (typeof objKey !== 'string' || typeof objValue !== 'object' || objValue === null || Array.isArray(objValue) || !validationCallback(objValue, logger)) {
            return { key: key, value: 'unknown', expected: 'Object of interfaces' };
        }
    }

    return null;
}

function validateNestedObjectOfInterfaces(key: string, value: unknown, logger: Logger | null = null,
    validationCallback: (input: unknown, logger: Logger | null) => boolean): ValidationError | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { key: key, value: getTypeOf(value), expected: 'Nested object of interfaces' };
    }

    for (const [keyOuter, valueOuter] of Object.entries(value)) {
        if (typeof keyOuter !== 'string' || typeof valueOuter !== 'object' || valueOuter === null ||
            Array.isArray(valueOuter)) {
            return { key: key, value: getTypeOf(valueOuter), expected: 'Outer nested object of interfaces' };
        }

        for (const [keyInner, valueInner] of Object.entries(valueOuter)) {
            if (typeof keyInner !== 'string' || typeof valueInner !== 'object' || valueInner === null ||
                Array.isArray(valueInner) || !validationCallback(valueInner, logger)) {
                return { key: key, value: 'unknown', expected: 'Inner nested object of interfaces' };
            }
        }
    }

    return null;
}

function validateObjectOfTypes(key: string, value: unknown, ...types: (string | null | undefined)[]):
    ValidationError | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { key: key, value: getTypeOf(value), expected: `Object of types ${types.join(', ')}` };
    }

    for (const [objKey, objValue] of Object.entries(value)) {
        if (typeof objKey !== 'string') {
            return { key: key, value: `objKey: ${typeof objKey}`, expected: `Object of types ${types.join(', ')}` };
        }

        let isValid = false;
        for (const type of types) {
            if (isType(objValue, type)) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            return { key: key, value: `objValue: ${typeof objValue}`, expected: `Object of types ${types.join(', ')}` };
        }
    }

    return null;
}

function validateUint8Array(key: string, value: unknown): ValidationError | null {
    if (!(value instanceof Uint8Array)) {
        return { key, value: getTypeOf(value), expected: 'Uint8Array' };
    }
    return null;
}

function logValidations(interfaceName: string, errors: ValidationError[], unknownKeys: string[],
    logger: Logger | null = null) {
    const functionName = `isValid${interfaceName}`;
    const hasOnlyValidKeys = unknownKeys.length === 0;

    const logError = logger ? logger.error.bind(logger) : console.error;

    if (errors.length !== 0 || !hasOnlyValidKeys) {
        logError(`[${functionName}] Invalid ${interfaceName} object.`);
        if (errors.length !== 0) {
            errors.forEach(error => {
                logError(`[${functionName}] Key: ${error.key}, Value: ${error.value}, ` +
                    `Expected: ${error.expected}.`);
            });
        }
        if (!hasOnlyValidKeys) {
            logError(`[${functionName}] Unknown keys: ${unknownKeys.join(', ')}.`);
        }
    }
}


/**
 * Validation checks for the rustplus.proto file interfaces and enums.
 */

export function isValidVector2(object: unknown, logger: Logger | null = null): object is rpi.Vector2 {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.Vector2;

    const interfaceName = 'Vector2';
    const validKeys = [
        'x',
        'y'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidVector3(object: unknown, logger: Logger | null = null): object is rpi.Vector3 {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.Vector3;

    const interfaceName = 'Vector3';
    const validKeys = [
        'x',
        'y',
        'z'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));
    errors.push(validateType('z', obj.z, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidVector4(object: unknown, logger: Logger | null = null): object is rpi.Vector4 {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.Vector4;

    const interfaceName = 'Vector4';
    const validKeys = [
        'x',
        'y',
        'z',
        'w'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));
    errors.push(validateType('z', obj.z, 'number'));
    errors.push(validateType('w', obj.w, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidHalf3(object: unknown, logger: Logger | null = null): object is rpi.Half3 {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.Half3;

    const interfaceName = 'Half3';
    const validKeys = [
        'x',
        'y',
        'z'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));
    errors.push(validateType('z', obj.z, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidColor(object: unknown, logger: Logger | null = null): object is rpi.Color {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.Color;

    const interfaceName = 'Color';
    const validKeys = [
        'r',
        'g',
        'b',
        'a'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('r', obj.r, 'number'));
    errors.push(validateType('g', obj.g, 'number'));
    errors.push(validateType('b', obj.b, 'number'));
    errors.push(validateType('a', obj.a, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidRay(object: unknown, logger: Logger | null = null): object is rpi.Ray {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.Ray;

    const interfaceName = 'Ray';
    const validKeys = [
        'origin',
        'direction'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(Object.hasOwn(obj, 'origin') ?
        validateInterface('origin', obj.origin, logger, isValidVector3) : null);
    errors.push(Object.hasOwn(obj, 'direction') ?
        validateInterface('direction', obj.direction, logger, isValidVector3) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanActionResult(object: unknown, logger: Logger | null = null): object is rpi.ClanActionResult {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanActionResult;

    const interfaceName = 'ClanActionResult';
    const validKeys = [
        'requestId',
        'result',
        'hasClanInfo',
        'clanInfo'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('requestId', obj.requestId, 'number'));
    errors.push(validateType('result', obj.result, 'number'));
    errors.push(validateType('hasClanInfo', obj.hasClanInfo, 'boolean'));
    errors.push(Object.hasOwn(obj, 'clanInfo') ?
        validateInterface('clanInfo', obj.clanInfo, logger, isValidClanInfo) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanInfo(object: unknown, logger: Logger | null = null): object is rpi.ClanInfo {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanInfo;

    const interfaceName = 'ClanInfo';
    const validKeys = [
        'clanId',
        'name',
        'created',
        'creator',
        'motd',
        'motdTimestamp',
        'motdAuthor',
        'logo',
        'color',
        'roles',
        'members',
        'invites',
        'maxMemberCount',
        'score'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('clanId', obj.clanId, 'string'));
    errors.push(validateType('name', obj.name, 'string'));
    errors.push(validateType('created', obj.created, 'string'));
    errors.push(validateType('creator', obj.creator, 'string'));
    errors.push(validateType('motd', obj.motd, 'string', undefined));
    errors.push(validateType('motdTimestamp', obj.motdTimestamp, 'string'));
    errors.push(validateType('motdAuthor', obj.motdAuthor, 'string'));
    errors.push(Object.hasOwn(obj, 'logo') ? validateUint8Array('logo', obj.logo) : null);
    errors.push(validateType('color', obj.color, 'number'));
    errors.push(validateArrayOfInterfaces('roles', obj.roles, logger, isValidClanInfo_Role));
    errors.push(validateArrayOfInterfaces('members', obj.members, logger, isValidClanInfo_Member));
    errors.push(validateArrayOfInterfaces('invites', obj.invites, logger, isValidClanInfo_Invite));
    errors.push(validateType('maxMemberCount', obj.maxMemberCount, 'number', undefined));
    errors.push(validateType('score', obj.score, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanInfo_Role(object: unknown, logger: Logger | null = null): object is rpi.ClanInfo_Role {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanInfo_Role;

    const interfaceName = 'ClanInfo_Role';
    const validKeys = [
        'roleId',
        'rank',
        'name',
        'canSetMotd',
        'canSetLogo',
        'canInvite',
        'canKick',
        'canPromote',
        'canDemote',
        'canSetPlayerNotes',
        'canAccessLogs',
        'canAccessScoreEvents'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('roleId', obj.roleId, 'number'));
    errors.push(validateType('rank', obj.rank, 'number'));
    errors.push(validateType('name', obj.name, 'string'));
    errors.push(validateType('canSetMotd', obj.canSetMotd, 'boolean'));
    errors.push(validateType('canSetLogo', obj.canSetLogo, 'boolean'));
    errors.push(validateType('canInvite', obj.canInvite, 'boolean'));
    errors.push(validateType('canKick', obj.canKick, 'boolean'));
    errors.push(validateType('canPromote', obj.canPromote, 'boolean'));
    errors.push(validateType('canDemote', obj.canDemote, 'boolean'));
    errors.push(validateType('canSetPlayerNotes', obj.canSetPlayerNotes, 'boolean'));
    errors.push(validateType('canAccessLogs', obj.canAccessLogs, 'boolean'));
    errors.push(validateType('canAccessScoreEvents', obj.canAccessScoreEvents, 'boolean'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanInfo_Member(object: unknown, logger: Logger | null = null): object is rpi.ClanInfo_Member {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanInfo_Member;

    const interfaceName = 'ClanInfo_Member';
    const validKeys = [
        'steamId',
        'roleId',
        'joined',
        'lastSeen',
        'notes',
        'online'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('steamId', obj.steamId, 'string'));
    errors.push(validateType('roleId', obj.roleId, 'number'));
    errors.push(validateType('joined', obj.joined, 'string'));
    errors.push(validateType('lastSeen', obj.lastSeen, 'string'));
    errors.push(validateType('notes', obj.notes, 'string', undefined));
    errors.push(validateType('online', obj.online, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanInfo_Invite(object: unknown, logger: Logger | null = null): object is rpi.ClanInfo_Invite {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanInfo_Invite;

    const interfaceName = 'ClanInfo_Invite';
    const validKeys = [
        'steamId',
        'recruiter',
        'timestamp'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('steamId', obj.steamId, 'string'));
    errors.push(validateType('recruiter', obj.recruiter, 'string'));
    errors.push(validateType('timestamp', obj.timestamp, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanLog(object: unknown, logger: Logger | null = null): object is rpi.ClanLog {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanLog;

    const interfaceName = 'ClanLog';
    const validKeys = [
        'clanId',
        'logEntries'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('clanId', obj.clanId, 'string'));
    errors.push(validateArrayOfInterfaces('logEntries', obj.logEntries, logger, isValidClanLog_Entry));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanLog_Entry(object: unknown, logger: Logger | null = null): object is rpi.ClanLog_Entry {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanLog_Entry;

    const interfaceName = 'ClanLog_Entry';
    const validKeys = [
        'timestamp',
        'eventKey',
        'arg1',
        'arg2',
        'arg3',
        'arg4'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('timestamp', obj.timestamp, 'string'));
    errors.push(validateType('eventKey', obj.eventKey, 'string'));
    errors.push(validateType('arg1', obj.arg1, 'string', undefined));
    errors.push(validateType('arg2', obj.arg2, 'string', undefined));
    errors.push(validateType('arg3', obj.arg3, 'string', undefined));
    errors.push(validateType('arg4', obj.arg4, 'string', undefined));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanInvitations(object: unknown, logger: Logger | null = null): object is rpi.ClanInvitations {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanInvitations;

    const interfaceName = 'ClanInvitations';
    const validKeys = [
        'invitations'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateArrayOfInterfaces('invitations', obj.invitations, logger, isValidClanInvitations_Invitation));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidClanInvitations_Invitation(object: unknown, logger: Logger | null = null):
    object is rpi.ClanInvitations_Invitation {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.ClanInvitations_Invitation;

    const interfaceName = 'ClanInvitations_Invitation';
    const validKeys = [
        'clanId',
        'recruiter',
        'timestamp'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('clanId', obj.clanId, 'string'));
    errors.push(validateType('recruiter', obj.recruiter, 'string'));
    errors.push(validateType('timestamp', obj.timestamp, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppRequest(object: unknown, logger: Logger | null = null): object is rpi.AppRequest {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppRequest;

    const interfaceName = 'AppRequest';
    const validKeys = [
        'seq',
        'playerId',
        'playerToken',
        'entityId',
        'getInfo',
        'getTime',
        'getMap',
        'getTeamInfo',
        'getTeamChat',
        'sendTeamMessage',
        'getEntityInfo',
        'setEntityValue',
        'checkSubscription',
        'setSubscription',
        'getMapMarkers',
        'promoteToLeader',
        'getClanInfo',
        'setClanMotd',
        'getClanChat',
        'sendClanMessage',
        'getNexusAuth',
        'cameraSubscribe',
        'cameraUnsubscribe',
        'cameraInput'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('seq', obj.seq, 'number'));
    errors.push(validateType('playerId', obj.playerId, 'string'));
    errors.push(validateType('playerToken', obj.playerToken, 'number'));
    errors.push(validateType('entityId', obj.entityId, 'number', undefined));
    errors.push(Object.hasOwn(obj, 'getInfo') ?
        validateInterface('getInfo', obj.getInfo, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'getTime') ?
        validateInterface('getTime', obj.getTime, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'getMap') ?
        validateInterface('getMap', obj.getMap, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'getTeamInfo') ?
        validateInterface('getTeamInfo', obj.getTeamInfo, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'getTeamChat') ?
        validateInterface('getTeamChat', obj.getTeamChat, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'sendTeamMessage') ?
        validateInterface('sendTeamMessage', obj.sendTeamMessage, logger, isValidAppSendMessage) : null);
    errors.push(Object.hasOwn(obj, 'getEntityInfo') ?
        validateInterface('getEntityInfo', obj.getEntityInfo, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'setEntityValue') ?
        validateInterface('setEntityValue', obj.setEntityValue, logger, isValidAppSetEntityValue) : null);
    errors.push(Object.hasOwn(obj, 'checkSubscription') ?
        validateInterface('checkSubscription', obj.checkSubscription, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'setSubscription') ?
        validateInterface('setSubscription', obj.setSubscription, logger, isValidAppFlag) : null);
    errors.push(Object.hasOwn(obj, 'getMapMarkers') ?
        validateInterface('getMapMarkers', obj.getMapMarkers, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'promoteToLeader') ?
        validateInterface('promoteToLeader', obj.promoteToLeader, logger, isValidAppPromoteToLeader) : null);
    errors.push(Object.hasOwn(obj, 'getClanInfo') ?
        validateInterface('getClanInfo', obj.getClanInfo, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'setClanMotd') ?
        validateInterface('setClanMotd', obj.setClanMotd, logger, isValidAppSendMessage) : null);
    errors.push(Object.hasOwn(obj, 'getClanChat') ?
        validateInterface('getClanChat', obj.getClanChat, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'sendClanMessage') ?
        validateInterface('sendClanMessage', obj.sendClanMessage, logger, isValidAppSendMessage) : null);
    errors.push(Object.hasOwn(obj, 'getNexusAuth') ?
        validateInterface('getNexusAuth', obj.getNexusAuth, logger, isValidAppGetNexusAuth) : null);
    errors.push(Object.hasOwn(obj, 'cameraSubscribe') ?
        validateInterface('cameraSubscribe', obj.cameraSubscribe, logger, isValidAppCameraSubscribe) : null);
    errors.push(Object.hasOwn(obj, 'cameraUnsubscribe') ?
        validateInterface('cameraUnsubscribe', obj.cameraUnsubscribe, logger, isValidAppEmpty) : null);
    errors.push(Object.hasOwn(obj, 'cameraInput') ?
        validateInterface('cameraInput', obj.cameraInput, logger, isValidAppCameraInfo) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppEmpty(object: unknown, logger: Logger | null = null): object is rpi.AppEmpty {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const interfaceName = 'AppEmpty';
    const validKeys: string[] = [];

    const errors: (ValidationError | null)[] = [];

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppSendMessage(object: unknown, logger: Logger | null = null): object is rpi.AppSendMessage {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppSendMessage;

    const interfaceName = 'AppSendMessage';
    const validKeys = [
        'message'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('message', obj.message, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppSetEntityValue(object: unknown, logger: Logger | null = null):
    object is rpi.AppSetEntityValue {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppSetEntityValue;

    const interfaceName = 'AppSetEntityValue';
    const validKeys = [
        'value'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('value', obj.value, 'boolean'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppFlag(object: unknown, logger: Logger | null = null): object is rpi.AppFlag {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppFlag;

    const interfaceName = 'AppFlag';
    const validKeys = [
        'value'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('value', obj.value, 'boolean', undefined));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppPromoteToLeader(object: unknown, logger: Logger | null = null):
    object is rpi.AppPromoteToLeader {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppPromoteToLeader;

    const interfaceName = 'AppPromoteToLeader';
    const validKeys = [
        'steamId'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('steamId', obj.steamId, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppGetNexusAuth(object: unknown, logger: Logger | null = null): object is rpi.AppGetNexusAuth {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppGetNexusAuth;

    const interfaceName = 'AppGetNexusAuth';
    const validKeys = [
        'appKey'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('appKey', obj.appKey, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppCameraSubscribe(object: unknown, logger: Logger | null = null):
    object is rpi.AppCameraSubscribe {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppCameraSubscribe;

    const interfaceName = 'AppCameraSubscribe';
    const validKeys = [
        'cameraId'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('cameraId', obj.cameraId, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppCameraInput(object: unknown, logger: Logger | null = null): object is rpi.AppCameraInput {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppCameraInput;

    const interfaceName = 'AppCameraInput';
    const validKeys = [
        'buttons',
        'mouseDelta'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('buttons', obj.buttons, 'number'));
    errors.push(Object.hasOwn(obj, 'mouseDelta') ?
        validateInterface('mouseDelta', obj.mouseDelta, logger, isValidVector2) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppMessage(object: unknown, logger: Logger | null = null): object is rpi.AppMessage {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppMessage;

    const interfaceName = 'AppMessage';
    const validKeys = [
        'response',
        'broadcast'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(Object.hasOwn(obj, 'response') ?
        validateInterface('response', obj.response, logger, isValidAppResponse) : null);
    errors.push(Object.hasOwn(obj, 'broadcast') ?
        validateInterface('broadcast', obj.broadcast, logger, isValidAppBroadcast) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppResponse(object: unknown, logger: Logger | null = null): object is rpi.AppResponse {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppResponse;

    const interfaceName = 'AppResponse';
    const validKeys = [
        'seq',
        'success',
        'error',
        'info',
        'time',
        'map',
        'teamInfo',
        'teamChat',
        'entityInfo',
        'flag',
        'mapMarkers',
        'clanInfo',
        'clanChat',
        'nexusAuth',
        'cameraSubscribeInfo'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('seq', obj.seq, 'number'));
    errors.push(Object.hasOwn(obj, 'success') ?
        validateInterface('success', obj.success, logger, isValidAppSuccess) : null);
    errors.push(Object.hasOwn(obj, 'error') ?
        validateInterface('error', obj.error, logger, isValidAppError) : null);
    errors.push(Object.hasOwn(obj, 'info') ?
        validateInterface('info', obj.info, logger, isValidAppInfo) : null);
    errors.push(Object.hasOwn(obj, 'time') ?
        validateInterface('time', obj.time, logger, isValidAppTime) : null);
    errors.push(Object.hasOwn(obj, 'map') ?
        validateInterface('map', obj.map, logger, isValidAppMap) : null);
    errors.push(Object.hasOwn(obj, 'teamInfo') ?
        validateInterface('teamInfo', obj.teamInfo, logger, isValidAppTeamInfo) : null);
    errors.push(Object.hasOwn(obj, 'teamChat') ?
        validateInterface('teamChat', obj.teamChat, logger, isValidAppTeamChat) : null);
    errors.push(Object.hasOwn(obj, 'entityInfo') ?
        validateInterface('entityInfo', obj.entityInfo, logger, isValidAppEntityInfo) : null);
    errors.push(Object.hasOwn(obj, 'flag') ?
        validateInterface('flag', obj.flag, logger, isValidAppFlag) : null);
    errors.push(Object.hasOwn(obj, 'mapMarkers') ?
        validateInterface('mapMarkers', obj.mapMarkers, logger, isValidAppMapMarkers) : null);
    errors.push(Object.hasOwn(obj, 'clanInfo') ?
        validateInterface('clanInfo', obj.clanInfo, logger, isValidAppClanInfo) : null);
    errors.push(Object.hasOwn(obj, 'clanChat') ?
        validateInterface('clanChat', obj.clanChat, logger, isValidAppClanChat) : null);
    errors.push(Object.hasOwn(obj, 'nexusAuth') ?
        validateInterface('nexusAuth', obj.nexusAuth, logger, isValidAppNexusAuth) : null);
    errors.push(Object.hasOwn(obj, 'cameraSubscribeInfo') ?
        validateInterface('cameraSubscribeInfo', obj.cameraSubscribeInfo, logger, isValidAppCameraInfo) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppSuccess(object: unknown, logger: Logger | null = null): object is rpi.AppSuccess {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const interfaceName = 'AppSuccess';
    const validKeys: string[] = [];

    const errors: (ValidationError | null)[] = [];

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppError(object: unknown, logger: Logger | null = null): object is rpi.AppError {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppError;

    const interfaceName = 'AppError';
    const validKeys = [
        'error'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('error', obj.error, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppInfo(object: unknown, logger: Logger | null = null): object is rpi.AppInfo {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppInfo;

    const interfaceName = 'AppInfo';
    const validKeys = [
        'name',
        'headerImage',
        'url',
        'map',
        'mapSize',
        'wipeTime',
        'players',
        'maxPlayers',
        'queuedPlayers',
        'seed',
        'salt',
        'logoImage',
        'nexus',
        'nexusId',
        'nexusZone',
        'camerasEnabled'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('name', obj.name, 'string'));
    errors.push(validateType('headerImage', obj.headerImage, 'string'));
    errors.push(validateType('url', obj.url, 'string'));
    errors.push(validateType('map', obj.map, 'string'));
    errors.push(validateType('mapSize', obj.mapSize, 'number'));
    errors.push(validateType('wipeTime', obj.wipeTime, 'number'));
    errors.push(validateType('players', obj.players, 'number'));
    errors.push(validateType('maxPlayers', obj.maxPlayers, 'number'));
    errors.push(validateType('queuedPlayers', obj.queuedPlayers, 'number'));
    errors.push(validateType('seed', obj.seed, 'number'));
    errors.push(validateType('salt', obj.salt, 'number'));
    errors.push(validateType('logoImage', obj.logoImage, 'string', undefined));
    errors.push(validateType('nexus', obj.nexus, 'string', undefined));
    errors.push(validateType('nexusId', obj.nexusId, 'number'));
    errors.push(validateType('nexusZone', obj.nexusZone, 'string', undefined));
    errors.push(validateType('camerasEnabled', obj.camerasEnabled, 'boolean'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTime(object: unknown, logger: Logger | null = null): object is rpi.AppTime {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTime;

    const interfaceName = 'AppTime';
    const validKeys = [
        'dayLengthMinutes',
        'timeScale',
        'sunrise',
        'sunset',
        'time'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('dayLengthMinutes', obj.dayLengthMinutes, 'number'));
    errors.push(validateType('timeScale', obj.timeScale, 'number'));
    errors.push(validateType('sunrise', obj.sunrise, 'number'));
    errors.push(validateType('sunset', obj.sunset, 'number'));
    errors.push(validateType('time', obj.time, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppMap(object: unknown, logger: Logger | null = null): object is rpi.AppMap {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppMap;

    const interfaceName = 'AppMap';
    const validKeys = [
        'width',
        'height',
        'jpgImage',
        'oceanMargin',
        'monuments',
        'background'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('width', obj.width, 'number'));
    errors.push(validateType('height', obj.height, 'number'));
    errors.push(validateUint8Array('jpgImage', obj.jpgImage));
    errors.push(validateType('oceanMargin', obj.oceanMargin, 'number'));
    errors.push(validateArrayOfInterfaces('monuments', obj.monuments, logger, isValidAppMap_Monument));
    errors.push(validateType('background', obj.background, 'string', undefined));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppMap_Monument(object: unknown, logger: Logger | null = null): object is rpi.AppMap_Monument {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppMap_Monument;

    const interfaceName = 'AppMap_Monument';
    const validKeys = [
        'token',
        'x',
        'y'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('token', obj.token, 'string'));
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTeamInfo(object: unknown, logger: Logger | null = null): object is rpi.AppTeamInfo {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTeamInfo;

    const interfaceName = 'AppTeamInfo';
    const validKeys = [
        'leaderSteamId',
        'members',
        'mapNotes',
        'leaderMapNotes'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('leaderSteamId', obj.leaderSteamId, 'string'));
    errors.push(validateArrayOfInterfaces('members', obj.members, logger, isValidAppTeamInfo_Member));
    errors.push(validateArrayOfInterfaces('mapNotes', obj.mapNotes, logger, isValidAppTeamInfo_Note));
    errors.push(validateArrayOfInterfaces('leaderMapNotes', obj.leaderMapNotes, logger, isValidAppTeamInfo_Note));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTeamInfo_Member(object: unknown, logger: Logger | null = null):
    object is rpi.AppTeamInfo_Member {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTeamInfo_Member;

    const interfaceName = 'AppTeamInfo_Member';
    const validKeys = [
        'steamId',
        'name',
        'x',
        'y',
        'isOnline',
        'spawnTime',
        'isAlive',
        'deathTime'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('steamId', obj.steamId, 'string'));
    errors.push(validateType('name', obj.name, 'string'));
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));
    errors.push(validateType('isOnline', obj.isOnline, 'boolean'));
    errors.push(validateType('spawnTime', obj.spawnTime, 'number'));
    errors.push(validateType('isAlive', obj.isAlive, 'boolean'));
    errors.push(validateType('deathTime', obj.deathTime, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTeamInfo_Note(object: unknown, logger: Logger | null = null):
    object is rpi.AppTeamInfo_Note {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTeamInfo_Note;

    const interfaceName = 'AppTeamInfo_Note';
    const validKeys = [
        'type',
        'x',
        'y',
        'icon',
        'colourIndex',
        'label'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateInterface('type', obj.type, logger, isValidAppTeamInfo_Note_Type));
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));
    errors.push(validateInterface('icon', obj.icon, logger, isValidAppTeamInfo_Note_Icon));
    errors.push(validateInterface('colourIndex', obj.colourIndex, logger, isValidAppTeamInfo_Note_ColourIndex));
    errors.push(validateType('label', obj.label, 'string', undefined));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTeamInfo_Note_Type(value: unknown): value is rpi.AppTeamInfo_Note_Type {
    return typeof value === 'number' && Object.values(rpi.AppTeamInfo_Note_Type).includes(value);
}

export function isValidAppTeamInfo_Note_Icon(value: unknown): value is rpi.AppTeamInfo_Note_Icon {
    return typeof value === 'number' && Object.values(rpi.AppTeamInfo_Note_Icon).includes(value);
}

export function isValidAppTeamInfo_Note_ColourIndex(value: unknown): value is rpi.AppTeamInfo_Note_ColourIndex {
    return typeof value === 'number' && Object.values(rpi.AppTeamInfo_Note_ColourIndex).includes(value);
}

export function isValidAppTeamChat(object: unknown, logger: Logger | null = null): object is rpi.AppTeamChat {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTeamChat;

    const interfaceName = 'AppTeamChat';
    const validKeys = [
        'messages'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateArrayOfInterfaces('messages', obj.messages, logger, isValidAppTeamMessage));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTeamMessage(object: unknown, logger: Logger | null = null): object is rpi.AppTeamMessage {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTeamMessage;

    const interfaceName = 'AppTeamMessage';
    const validKeys = [
        'steamId',
        'name',
        'message',
        'color',
        'time'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('steamId', obj.steamId, 'string'));
    errors.push(validateType('name', obj.name, 'string'));
    errors.push(validateType('message', obj.message, 'string'));
    errors.push(validateType('color', obj.color, 'string'));
    errors.push(validateType('time', obj.time, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppEntityInfo(object: unknown, logger: Logger | null = null): object is rpi.AppEntityInfo {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppEntityInfo;

    const interfaceName = 'AppEntityInfo';
    const validKeys = [
        'type',
        'payload'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateInterface('type', obj.type, logger, isValidAppEntityType));
    errors.push(Object.hasOwn(obj, 'payload') ?
        validateInterface('payload', obj.payload, logger, isValidAppEntityPayload) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppEntityType(value: unknown): value is rpi.AppEntityType {
    return typeof value === 'number' && Object.values(rpi.AppEntityType).includes(value);
}

export function isValidAppEntityPayload(object: unknown, logger: Logger | null = null): object is rpi.AppEntityPayload {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppEntityPayload;

    const interfaceName = 'AppEntityPayload';
    const validKeys = [
        'value',
        'items',
        'capacity',
        'hasProtection',
        'protectionExpiry'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('value', obj.value, 'boolean'));
    errors.push(validateArrayOfInterfaces('items', obj.items, logger, isValidAppEntityPayload_Item));
    errors.push(validateType('capacity', obj.capacity, 'number'));
    errors.push(validateType('hasProtection', obj.hasProtection, 'boolean', undefined));
    errors.push(validateType('protectionExpiry', obj.protectionExpiry, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppEntityPayload_Item(object: unknown, logger: Logger | null = null):
    object is rpi.AppEntityPayload_Item {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppEntityPayload_Item;

    const interfaceName = 'AppEntityPayload_Item';
    const validKeys = [
        'itemId',
        'quantity',
        'itemIsBlueprint'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('itemId', obj.itemId, 'number'));
    errors.push(validateType('quantity', obj.quantity, 'number'));
    errors.push(validateType('itemIsBlueprint', obj.itemIsBlueprint, 'boolean'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppMapMarkers(object: unknown, logger: Logger | null = null): object is rpi.AppMapMarkers {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppMapMarkers;

    const interfaceName = 'AppMapMarkers';
    const validKeys = [
        'markers'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateArrayOfInterfaces('markers', obj.markers, logger, isValidAppMarker));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppMarker(object: unknown, logger: Logger | null = null): object is rpi.AppMarker {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppMarker;

    const interfaceName = 'AppMarker';
    const validKeys = [
        'id',
        'type',
        'x',
        'y',
        'steamId',
        'rotation',
        'radius',
        'color1',
        'color2',
        'alpha',
        'name',
        'outOfStock',
        'sellOrders'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('id', obj.id, 'number'));
    errors.push(validateInterface('type', obj.type, logger, isValidAppMarkerType));
    errors.push(validateType('x', obj.x, 'number'));
    errors.push(validateType('y', obj.y, 'number'));
    errors.push(validateType('steamId', obj.steamId, 'string'));
    errors.push(validateType('rotation', obj.rotation, 'number'));
    errors.push(validateType('radius', obj.radius, 'number'));
    errors.push(Object.hasOwn(obj, 'color1') ?
        validateInterface('color1', obj.color1, logger, isValidVector4) : null);
    errors.push(Object.hasOwn(obj, 'color2') ?
        validateInterface('color2', obj.color2, logger, isValidVector4) : null);
    errors.push(validateType('alpha', obj.alpha, 'number'));
    errors.push(validateType('name', obj.name, 'string', undefined));
    errors.push(validateType('outOfStock', obj.outOfStock, 'boolean'));
    errors.push(validateArrayOfInterfaces('sellOrders', obj.sellOrders, logger, isValidAppMarker_SellOrder));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppMarkerType(value: unknown): value is rpi.AppMarkerType {
    return typeof value === 'number' && Object.values(rpi.AppMarkerType).includes(value);
}

export function isValidAppMarker_SellOrder(object: unknown, logger: Logger | null = null):
    object is rpi.AppMarker_SellOrder {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppMarker_SellOrder;

    const interfaceName = 'AppMarker_SellOrder';
    const validKeys = [
        'itemId',
        'quantity',
        'currencyId',
        'costPerItem',
        'amountInStock',
        'itemIsBlueprint',
        'currencyIsBlueprint',
        'itemCondition',
        'itemConditionMax',
        'priceMultiplier'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('itemId', obj.itemId, 'number'));
    errors.push(validateType('quantity', obj.quantity, 'number'));
    errors.push(validateType('currencyId', obj.currencyId, 'number'));
    errors.push(validateType('costPerItem', obj.costPerItem, 'number'));
    errors.push(validateType('amountInStock', obj.amountInStock, 'number'));
    errors.push(validateType('itemIsBlueprint', obj.itemIsBlueprint, 'boolean'));
    errors.push(validateType('currencyIsBlueprint', obj.currencyIsBlueprint, 'boolean'));
    errors.push(validateType('itemCondition', obj.itemCondition, 'number'));
    errors.push(validateType('itemConditionMax', obj.itemConditionMax, 'number'));
    errors.push(validateType('priceMultiplier', obj.priceMultiplier, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppClanInfo(object: unknown, logger: Logger | null = null): object is rpi.AppClanInfo {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppClanInfo;

    const interfaceName = 'AppClanInfo';
    const validKeys = [
        'clanInfo'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(Object.hasOwn(obj, 'clanInfo') ?
        validateInterface('clanInfo', obj.clanInfo, logger, isValidClanInfo) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppClanChat(object: unknown, logger: Logger | null = null): object is rpi.AppClanChat {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppClanChat;

    const interfaceName = 'AppClanChat';
    const validKeys = [
        'messages'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateArrayOfInterfaces('messages', obj.messages, logger, isValidAppClanMessage));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppClanMessage(object: unknown, logger: Logger | null = null): object is rpi.AppClanMessage {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppClanMessage;

    const interfaceName = 'AppClanMessage';
    const validKeys = [
        'steamId',
        'name',
        'message',
        'time'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('steamId', obj.steamId, 'string'));
    errors.push(validateType('name', obj.name, 'string'));
    errors.push(validateType('message', obj.message, 'string'));
    errors.push(validateType('time', obj.time, 'string'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppNexusAuth(object: unknown, logger: Logger | null = null): object is rpi.AppNexusAuth {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppNexusAuth;

    const interfaceName = 'AppNexusAuth';
    const validKeys = [
        'serverId',
        'playerToken'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('serverId', obj.serverId, 'string'));
    errors.push(validateType('playerToken', obj.playerToken, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppCameraInfo(object: unknown, logger: Logger | null = null): object is rpi.AppCameraInfo {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppCameraInfo;

    const interfaceName = 'AppCameraInfo';
    const validKeys = [
        'width',
        'height',
        'nearPlane',
        'farPlane',
        'controlFlags'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('width', obj.width, 'number'));
    errors.push(validateType('height', obj.height, 'number'));
    errors.push(validateType('nearPlane', obj.nearPlane, 'number'));
    errors.push(validateType('farPlane', obj.farPlane, 'number'));
    errors.push(validateType('controlFlags', obj.controlFlags, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppBroadcast(object: unknown, logger: Logger | null = null): object is rpi.AppBroadcast {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppBroadcast;

    const interfaceName = 'AppBroadcast';
    const validKeys = [
        'teamChanged',
        'teamMessage',
        'entityChanged',
        'clanChanged',
        'clanMessage',
        'cameraRays'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(Object.hasOwn(obj, 'teamChanged') ?
        validateInterface('teamChanged', obj.teamChanged, logger, isValidAppTeamChanged) : null);
    errors.push(Object.hasOwn(obj, 'teamMessage') ?
        validateInterface('teamMessage', obj.teamMessage, logger, isValidAppTeamMessage) : null);
    errors.push(Object.hasOwn(obj, 'entityChanged') ?
        validateInterface('entityChanged', obj.entityChanged, logger, isValidAppEntityChanged) : null);
    errors.push(Object.hasOwn(obj, 'clanChanged') ?
        validateInterface('clanChanged', obj.clanChanged, logger, isValidAppClanChanged) : null);
    errors.push(Object.hasOwn(obj, 'clanMessage') ?
        validateInterface('clanMessage', obj.clanMessage, logger, isValidAppNewClanMessage) : null);
    errors.push(Object.hasOwn(obj, 'cameraRays') ?
        validateInterface('cameraRays', obj.cameraRays, logger, isValidAppCameraRays) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppTeamChanged(object: unknown, logger: Logger | null = null): object is rpi.AppTeamChanged {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppTeamChanged;

    const interfaceName = 'AppTeamChanged';
    const validKeys = [
        'playerId',
        'teamInfo'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('playerId', obj.playerId, 'string'));
    errors.push(Object.hasOwn(obj, 'teamInfo') ?
        validateInterface('teamInfo', obj.teamInfo, logger, isValidAppTeamInfo) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppNewTeamMessage(object: unknown, logger: Logger | null = null):
    object is rpi.AppNewTeamMessage {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppNewTeamMessage;

    const interfaceName = 'AppNewTeamMessage';
    const validKeys = [
        'message'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(Object.hasOwn(obj, 'message') ?
        validateInterface('message', obj.message, logger, isValidAppTeamMessage) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppEntityChanged(object: unknown, logger: Logger | null = null): object is rpi.AppEntityChanged {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppEntityChanged;

    const interfaceName = 'AppEntityChanged';
    const validKeys = [
        'entityId',
        'payload'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('entityId', obj.entityId, 'number', undefined));
    errors.push(Object.hasOwn(obj, 'payload') ?
        validateInterface('payload', obj.payload, logger, isValidAppEntityPayload) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppClanChanged(object: unknown, logger: Logger | null = null): object is rpi.AppClanChanged {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppClanChanged;

    const interfaceName = 'AppClanChanged';
    const validKeys = [
        'clanInfo'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(Object.hasOwn(obj, 'clanInfo') ?
        validateInterface('clanInfo', obj.clanInfo, logger, isValidClanInfo) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppNewClanMessage(object: unknown, logger: Logger | null = null):
    object is rpi.AppNewClanMessage {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppNewClanMessage;

    const interfaceName = 'AppNewClanMessage';
    const validKeys = [
        'clanId',
        'message'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('clanId', obj.clanId, 'string'));
    errors.push(Object.hasOwn(obj, 'message') ?
        validateInterface('message', obj.message, logger, isValidAppClanMessage) : null);

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppCameraRays(object: unknown, logger: Logger | null = null):
    object is rpi.AppCameraRays {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppCameraRays;

    const interfaceName = 'AppCameraRays';
    const validKeys = [
        'verticalFov',
        'sampleOffset',
        'rayData',
        'distance',
        'entities',
        'timeOfDay'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('verticalFov', obj.verticalFov, 'number'));
    errors.push(validateType('sampleOffset', obj.sampleOffset, 'number'));
    errors.push(validateUint8Array('rayData', obj.rayData));
    errors.push(validateType('distance', obj.distance, 'number'));
    errors.push(validateArrayOfInterfaces('entities', obj.entities, logger, isValidAppCameraRays_Entity));
    errors.push(validateType('timeOfDay', obj.timeOfDay, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppCameraRays_Entity(object: unknown, logger: Logger | null = null):
    object is rpi.AppCameraRays_Entity {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rpi.AppCameraRays_Entity;

    const interfaceName = 'AppCameraRays_Entity';
    const validKeys = [
        'entityId',
        'type',
        'position',
        'rotation',
        'size',
        'name'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('entityId', obj.entityId, 'number'));
    errors.push(validateInterface('type', obj.type, logger, isValidAppCameraRays_EntityType));
    errors.push(Object.hasOwn(obj, 'position') ?
        validateInterface('position', obj.position, logger, isValidVector3) : null);
    errors.push(Object.hasOwn(obj, 'rotation') ?
        validateInterface('rotation', obj.rotation, logger, isValidVector3) : null);
    errors.push(Object.hasOwn(obj, 'size') ?
        validateInterface('size', obj.size, logger, isValidVector3) : null);
    errors.push(validateType('name', obj.name, 'string', undefined));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidAppCameraRays_EntityType(value: unknown): value is rpi.AppCameraRays_EntityType {
    return typeof value === 'number' && Object.values(rpi.AppCameraRays_EntityType).includes(value);
}


/**
 * Validation checks for other interfaces and enums.
 */

export function isValidRustPlusRequestTokens(object: unknown, logger: Logger | null = null):
    object is rp.RustPlusRequestTokens {
    if (typeof object !== 'object' || object === null || Array.isArray(object)) {
        return false;
    }

    const obj = object as rp.RustPlusRequestTokens;

    const interfaceName = 'RustPlusRequestTokens';
    const validKeys = [
        'connection',
        'playerId',
        'serverPairing'
    ];

    const errors: (ValidationError | null)[] = [];
    errors.push(validateType('connection', obj.connection, 'number'));
    errors.push(validateObjectOfTypes('playerId', obj.playerId, 'number'));
    errors.push(validateType('serverPairing', obj.serverPairing, 'number'));

    const filteredErrors = errors.filter((error): error is ValidationError => error !== null);

    const objectKeys = Object.keys(object);
    const unknownKeys = objectKeys.filter(key => !validKeys.includes(key));
    const hasOnlyValidKeys = unknownKeys.length === 0;

    logValidations(interfaceName, filteredErrors, unknownKeys, logger);

    return filteredErrors.length === 0 && hasOnlyValidKeys;
}

export function isValidEmitErrorType(value: unknown): value is rp.EmitErrorType {
    return typeof value === 'number' && Object.values(rp.EmitErrorType).includes(value);
}

export function isValidAppResponseError(value: unknown): value is rp.AppResponseError {
    return typeof value === 'number' && Object.values(rp.AppResponseError).includes(value);
}

export function isValidConsumeTokensError(value: unknown): value is rp.ConsumeTokensError {
    return typeof value === 'number' && Object.values(rp.ConsumeTokensError).includes(value);
}