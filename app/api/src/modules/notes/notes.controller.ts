import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtGuard } from '../../common/auth/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/auth/current-user.decorator';

@Controller('api/reports/:reportId/notes')
@UseGuards(JwtGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /**
   * GET /api/reports/:reportId/notes
   * Employee → their own thread only.
   * CEO → all threads.
   */
  @Get()
  async getNotes(
    @Param('reportId') reportId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.getNotes(reportId, user);
  }

  /**
   * POST /api/reports/:reportId/notes
   * Employee → root note (no parentId) or reply within own thread.
   * CEO → reply into employee thread (parentId required).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Param('reportId') reportId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.createNote(reportId, dto, user);
  }

  /**
   * PUT /api/reports/:reportId/notes/:noteId
   * Only the author of the note can edit it.
   */
  @Put(':noteId')
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.updateNote(noteId, dto, user);
  }

  /**
   * DELETE /api/reports/:reportId/notes/:noteId
   * Author can delete own; super_admin can delete any.
   */
  @Delete(':noteId')
  async deleteNote(
    @Param('noteId') noteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.deleteNote(noteId, user);
  }
}
