import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { DocumentsService, MAX_BYTES } from "./documents.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { DocumentCategory } from "@prisma/client";
import { UploadDocumentDto, RemoveDocumentDto } from "./dto/document.dto";

/** Restricted records are gated on a permission the ordinary reader lacks. */
const canSeeRestricted = (user: JwtPayload) =>
  (ROLE_PERMISSIONS[user.role] ?? []).includes(PERMISSIONS.DOCUMENTS_RESTRICTED);

@Controller("documents")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  list(
    @CurrentUser() user: JwtPayload,
    @Query("patientId") patientId?: string,
    @Query("encounterId") encounterId?: string,
    @Query("claimId") claimId?: string,
    @Query("category") category?: DocumentCategory,
    @Query("search") search?: string,
    @Query("includeDeleted") includeDeleted?: string,
  ) {
    return this.documents.list(user.organizationId!, {
      patientId,
      encounterId,
      claimId,
      category,
      search,
      includeDeleted: includeDeleted === "true",
      canSeeRestricted: canSeeRestricted(user),
    });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  summary(@CurrentUser() user: JwtPayload) {
    return this.documents.summary(user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_MANAGE)
  // Held in memory so the checksum can be taken and the type checked before
  // anything is written; the cap is enforced here as well as in the service so
  // an oversized body is rejected before it is all read.
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BYTES } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException("No file was attached to the upload");

    return this.documents.upload(file, body, user.organizationId!, user.staffId);
  }

  @Get(":id/versions")
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  versions(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.documents.versions(id, user.organizationId!);
  }

  /**
   * Streams the file to the caller.
   *
   * Everything goes through here rather than a static directory, so every
   * download passes the permission check and lands in the audit trail — who
   * opened whose scan is exactly the question an investigation asks.
   */
  @Get(":id/download")
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  async download(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const doc = await this.documents.forDownload(
      id,
      user.organizationId!,
      canSeeRestricted(user),
    );

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Length", doc.sizeBytes);
    // Never inline: a stored HTML or SVG rendered in the app's own origin
    // would run its script against the signed-in session.
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${doc.fileName.replace(/[^\w.\-() ]/g, "_")}"`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");

    this.documents.stream(doc.storageKey).pipe(res);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.DOCUMENTS_MANAGE)
  remove(
    @Param("id") id: string,
    @Body() body: RemoveDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documents.remove(id, body.reason, user.organizationId!, user.staffId);
  }
}
