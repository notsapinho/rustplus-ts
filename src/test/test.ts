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

import * as fs from 'fs';
import * as dotenv from 'dotenv';

import * as rustplus from '../index';

dotenv.config();

const ip = process.env.RUST_SERVER_IP_ADDRESS as string;
const port = process.env.RUST_SERVER_PORT as string;

const teamMember1SteamId = process.env.TEAM_MEMBER_1_STEAM_ID as string;
const teamMember1Token = parseInt(process.env.TEAM_MEMBER_1_TOKEN as string, 10);

const teamMember2SteamId = process.env.TEAM_MEMBER_2_STEAM_ID as string;
const teamMember2Token = parseInt(process.env.TEAM_MEMBER_2_TOKEN as string, 10);

const smartSwitch0 = parseInt(process.env.SMART_SWITCH_0 as string, 10);
const smartSwitch1 = parseInt(process.env.SMART_SWITCH_1 as string, 10);
const smartSwitch2 = parseInt(process.env.SMART_SWITCH_2 as string, 10);

const smartAlarm0 = parseInt(process.env.SMART_ALARM_0 as string, 10);
const smartAlarm1 = parseInt(process.env.SMART_ALARM_1 as string, 10);
const smartAlarm2 = parseInt(process.env.SMART_ALARM_2 as string, 10);

const storageMonitor0 = parseInt(process.env.STORAGE_MONITOR_0 as string, 10); // Tool Cupboard
const storageMonitor1 = parseInt(process.env.STORAGE_MONITOR_1 as string, 10); // Vending Machine
const storageMonitor2 = parseInt(process.env.STORAGE_MONITOR_2 as string, 10); // Large Wood Box

const storageMonitor3 = parseInt(process.env.STORAGE_MONITOR_3 as string, 10); // Tool Cupboard wihout power
const storageMonitor4 = parseInt(process.env.STORAGE_MONITOR_4 as string, 10); // Vending Machine without power
const storageMonitor5 = parseInt(process.env.STORAGE_MONITOR_5 as string, 10); // Large Wood Box without power

const camera1 = process.env.CAM1 as string; // Regular camera
const camera2 = process.env.CAM2 as string; // PTZ camera
const drone1 = process.env.DRONE1 as string;
const turret1 = process.env.TURRET1 as string;

let printMessage = true;
let printRequest = true;


function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run_test_functions() {
    const rp = new rustplus.RustPlus(ip, port)

    rp.on('connecting', async () => {
        console.log('EVENT connecting');
    });

    rp.on('connected', async () => {
        console.log('EVENT connected');

        printMessage = false;
        printRequest = false;
        //await test_callback_api_functions(rp);
        await test_async_api_functions(rp);
        //await test_camera_module(rp);
        printMessage = true;
        printRequest = true;

        for (let i = 3; i >= 0; i--) {
            console.log(`Closing connection in ${i}...`);
            if (i !== 0) {
                await delay(1000);
            }
        }
        await rp.disconnect()
    });

    rp.on('message', async (appMessage: rustplus.AppMessage, handled: boolean) => {
        if (printMessage) {
            console.log(`EVENT message: ${JSON.stringify(appMessage)}, handled: ${handled}`);
        }
    });

    rp.on('request', async (appRequest: rustplus.AppRequest) => {
        if (printRequest) {
            console.log(`EVENT request: ${JSON.stringify(appRequest)}`);
        }
    });

    rp.on('disconnected', async () => {
        console.log('EVENT disconnected');
    });

    rp.on('error', async (errorType: rustplus.EmitErrorType, error: any) => {
        console.log(`EVENT error: Type: ${errorType}, Error: ${error.message}, Code: ${error.code}`);
    });

    await rp.connect()
}

async function test_callback_api_functions(rp: rustplus.RustPlus) {
    //rp.getInfo('76561198114074446', token, (appInfo: rustplus.AppMessage) => {
    //    console.log(JSON.stringify(appInfo))
    //});
}
/**
 * Prerequisite:
 * - Team Duo, to be able to test promote leader.
 * - 1 Smart Switch defined.
 * - 1 Smart Alarm defined.
 * - 2 Storage Monitors Tool Cupboards defined, one powered and one not powered.
 * - 2 Storage Monitors Vending Machines defined, one powered and one not powered.
 * - 2 Storage Monitors Large Wood Box defined, one powered and one not powered.
 */
async function test_async_api_functions(rp: rustplus.RustPlus) {
    let response: rustplus.AppResponse | Error | rustplus.ConsumeTokensError;

    console.log('Validating getInfoAsync:');
    response = await rp.getInfoAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getTimeAsync:');
    response = await rp.getTimeAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getMapAsync:');
    response = await rp.getMapAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getTeamInfoAsync:');
    response = await rp.getTeamInfoAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getTeamChatAsync:');
    response = await rp.getTeamChatAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response, [rustplus.AppResponseError.NoTeam]);
    console.log(' - OK');
    await delay(500);

    console.log('Validating sendTeamMessageAsync:');
    response = await rp.sendTeamMessageAsync(teamMember1SteamId, teamMember1Token, 'Test Team Message');
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Invalid Smart Device:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, 123456789);
    validateAsyncResponse(rp, response, [rustplus.AppResponseError.NotFound]);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Smart Device:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, smartSwitch0);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Smart Alarm:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, smartAlarm0);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Storage Monitor Tool Cupboard With Power:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, storageMonitor0);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Storage Monitor Vending Machine With Power:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, storageMonitor1);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Storage Monitor Large Wood Box With Power:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, storageMonitor2);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Storage Monitor Tool Cupboard Without Power:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, storageMonitor3);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Storage Monitor Vending Machine Without Power:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, storageMonitor4);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getEntityInfoAsync: Test Valid Storage Monitor Large Wood Box Without Power:');
    response = await rp.getEntityInfoAsync(teamMember1SteamId, teamMember1Token, storageMonitor5);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating setEntityValueAsync: Test Set Smart Switch to ON:');
    response = await rp.setEntityValueAsync(teamMember1SteamId, teamMember1Token, smartSwitch0, true);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(3000);

    console.log('Validating setEntityValueAsync: Test Set Smart Switch to OFF:');
    response = await rp.setEntityValueAsync(teamMember1SteamId, teamMember1Token, smartSwitch0, false);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating checkSubscriptionAsync: Test Check on Smart Alarm:');
    response = await rp.checkSubscriptionAsync(teamMember1SteamId, teamMember1Token, smartAlarm0);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating setSubscriptionAsync: Test Subscribe to Smart Alarm:');
    response = await rp.setSubscriptionAsync(teamMember1SteamId, teamMember1Token, smartAlarm0, true);
    validateAsyncResponse(rp, response, [rustplus.AppResponseError.TooManySubscribers]);
    console.log(' - OK');
    await delay(500);

    console.log('Validating setSubscriptionAsync: Test Unsubscribe from Smart Alarm:');
    response = await rp.setSubscriptionAsync(teamMember1SteamId, teamMember1Token, smartAlarm0, false);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating getMapMarkersAsync:');
    response = await rp.getMapMarkersAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating promoteToLeaderAsync: Test Promote Player1 from Player1');
    response = await rp.promoteToLeaderAsync(teamMember1SteamId, teamMember1Token, teamMember1SteamId);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating promoteToLeaderAsync: Test Promote Player2 from Player1');
    response = await rp.promoteToLeaderAsync(teamMember1SteamId, teamMember1Token, teamMember2SteamId);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(3000);

    console.log('Validating that leader was transferred to player2 from Player1:');
    response = await rp.getTeamInfoAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    if (((response as rustplus.AppResponse).teamInfo as rustplus.AppTeamInfo).leaderSteamId === teamMember2SteamId) {
        console.log(' - OK');
    }
    else {
        console.log(' - NOK');
        rp.disconnect()
        process.exit(1);
    }
    await delay(500);

    console.log('Validating promoteToLeaderAsync: Test Promote Player1 from Player2');
    response = await rp.promoteToLeaderAsync(teamMember2SteamId, teamMember2Token, teamMember1SteamId);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(3000);

    console.log('Validating that leader was transferred to Player1 from Player2:');
    response = await rp.getTeamInfoAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    if (((response as rustplus.AppResponse).teamInfo as rustplus.AppTeamInfo).leaderSteamId === teamMember1SteamId) {
        console.log(' - OK');
    }
    else {
        console.log(' - NOK');
        rp.disconnect()
        process.exit(1);
    }
    await delay(500);

    /* Not implemented. */
    //console.log('Validating getClanInfoAsync:');
    //response = await rp.getClanInfoAsync(teamMember1SteamId, teamMember1Token);
    //validateAsyncResponse(rp, response);
    //console.log(' - OK');
    //await delay(500);

    /* Not implemented. */
    //console.log('Validating setClanMotdAsync:');
    //response = await rp.setClanMotdAsync(teamMember1SteamId, teamMember1Token, 'Test Motd');
    //validateAsyncResponse(rp, response);
    //console.log(' - OK');
    //await delay(500);

    /* Not implemented. */
    //console.log('Validating getClanChatAsync:');
    //response = await rp.getClanChatAsync(teamMember1SteamId, teamMember1Token);
    //validateAsyncResponse(rp, response);
    //console.log(' - OK');
    //await delay(500);

    /* Not implemented. */
    //console.log('Validating sendClanMessageAsync:');
    //response = await rp.sendClanMessageAsync(teamMember1SteamId, teamMember1Token, 'Test Clan Message');
    //validateAsyncResponse(rp, response);
    //console.log(' - OK');
    //await delay(500);

    /* Not implemented. */
    //console.log('Validating getNexusAuthAsync:');
    //response = await rp.getNexusAuthAsync(teamMember1SteamId, teamMember1Token, 'Test Application Key');
    //validateAsyncResponse(rp, response, rustplus.AppResponseError.NotFound);
    //console.log(' - OK');
    //await delay(500);

    console.log('Validating cameraSubscribeAsync: CAM1:');
    response = await rp.cameraSubscribeAsync(teamMember1SteamId, teamMember1Token, 'CAM1');
    validateAsyncResponse(rp, response, [rustplus.AppResponseError.PlayerOnline]);
    console.log(' - OK');
    await delay(500);

    console.log('Validating cameraUnsubscribeAsync:');
    response = await rp.cameraUnsubscribeAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);

    console.log('Validating cameraSubscribeAsync: DRONE1:');
    response = await rp.cameraSubscribeAsync(teamMember1SteamId, teamMember1Token, 'DRONE1');
    validateAsyncResponse(rp, response, [rustplus.AppResponseError.PlayerOnline]);
    console.log(' - OK');
    await delay(500);

    console.log('Validating cameraInputAsync: DRONE1:');
    response = await rp.cameraInputAsync(teamMember1SteamId, teamMember1Token, 0, 10, 10);
    validateAsyncResponse(rp, response, [rustplus.AppResponseError.NoCamera]);
    console.log(' - OK');
    await delay(500);

    console.log('Validating cameraInputAsync:');
    response = await rp.cameraUnsubscribeAsync(teamMember1SteamId, teamMember1Token);
    validateAsyncResponse(rp, response);
    console.log(' - OK');
    await delay(500);
}

async function test_camera_module(rp: rustplus.RustPlus) {
    const camera = new rustplus.Camera(rp);

    camera.on('render', async (frame) => {
        /* Save camera frame to disk. */
        fs.writeFileSync(`camera.png`, frame);

        await camera.unsubscribe();
    });

    await camera.subscribe(teamMember1SteamId, teamMember1Token, 'CAM2');
    await delay(5000);
}

function validateAsyncResponse(rp: rustplus.RustPlus,
    response: rustplus.AppResponse | Error | rustplus.ConsumeTokensError,
    allowedResponseErrors: rustplus.AppResponseError[] = []) {
    if (response instanceof Error) {
        console.error(` - NOK, response === Error: ${response.message}`);
        rp.disconnect()
        process.exit(1);
    }

    if (rustplus.isValidConsumeTokensError(response) && response !== rustplus.ConsumeTokensError.NoError) {
        console.error(` - NOK, ConsumeTokensError: ${response}`);
        rp.disconnect()
        process.exit(1);
    }

    if (rustplus.isValidAppResponse(response)) {
        const responseError = rp.getAppResponseError(response);
        if (responseError === rustplus.AppResponseError.NoError) {
            return;
        }

        if (allowedResponseErrors.includes(responseError)) {
            return;
        }
        else {
            console.error(` - NOK, AppResponseError: ${rp.getAppResponseError(response)}`);
            rp.disconnect()
            process.exit(1);
        }
    }
    else {
        console.error(` - NOK, Unknown error.`);
        rp.disconnect()
        process.exit(1);
    }
}

run_test_functions();