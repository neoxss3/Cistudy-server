import { extnameConfig } from "@config"
import { SupabaseService } from "@global"
import { Injectable, StreamableFile } from "@nestjs/common"
import { extname } from "path"
import { GetInput } from "./shared"

@Injectable()
export default class AssetService {
    constructor(private readonly supabaseService: SupabaseService) {}

    async get(input: GetInput): Promise<StreamableFile> {
        const { data } = input
        console.log(data)
        const { filename, fileBody } = await this.supabaseService.get(data)
        const contentType = extnameConfig().extnameToContentType[extname(filename)]
    
        return new StreamableFile(Buffer.from(fileBody), {
            type: contentType,
            disposition: `inline; filename="${filename}"`,
        })
    }
}