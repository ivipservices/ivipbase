import { AxiosProgressEvent } from "axios";
/**
 * @returns returns a promise that resolves with an object containing data and an optionally returned context
 */
export default function request(method: "GET" | "POST" | "PUT" | "DELETE", url: string, options?: {
    accessToken?: string | null;
    data?: any;
    dataReceivedCallback?: ((chunk: any) => void) | null;
    dataRequestCallback?: ((bytes: number) => Promise<any> | any) | null;
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
    context?: any;
}): Promise<{
    context: any;
    data: any;
}>;
//# sourceMappingURL=index.d.ts.map