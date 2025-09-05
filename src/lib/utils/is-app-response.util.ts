import type { AppResponse } from "@/lib/interfaces/rustplus";

export function isValidAppResponse(response: any): response is AppResponse {
    return response && !response.error;
}
