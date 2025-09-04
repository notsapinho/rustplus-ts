import type { AppResponse } from "@/interfaces/rustplus";

export function isValidAppResponse(response: any): response is AppResponse {
    return response && !response.error;
}
