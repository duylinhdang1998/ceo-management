import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { NotesRepository, NotePublic } from './notes.repository';
import { AssignmentsService } from '../assignments/assignments.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtPayload } from '../../common/auth/current-user.decorator';

@Injectable()
export class NotesService {
  constructor(
    private readonly repo: NotesRepository,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  // ─── GET /api/reports/:id/notes ─────────────────────────────────────────────

  async getNotes(reportId: string, user: JwtPayload): Promise<NotePublic[]> {
    // Verify report exists
    const exists = await this.repo.reportExists(reportId);
    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Báo cáo không tồn tại' });
    }

    if (user.role === 'super_admin') {
      // CEO sees all threads
      return this.repo.findAllByReport(reportId);
    }

    // Employee: must be assigned to the report
    const assigned = await this.assignmentsService.isAssigned(reportId, user.sub);
    if (!assigned) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không được gán vào báo cáo này' });
    }

    // Employee sees only their own thread
    return this.repo.findByReportAndOwner(reportId, user.sub);
  }

  // ─── POST /api/reports/:id/notes ────────────────────────────────────────────

  async createNote(
    reportId: string,
    dto: CreateNoteDto,
    user: JwtPayload,
  ): Promise<NotePublic> {
    // Verify report exists
    const reportExists = await this.repo.reportExists(reportId);
    if (!reportExists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Báo cáo không tồn tại' });
    }

    if (user.role === 'super_admin') {
      return this.createNoteCeo(reportId, dto, user.sub);
    }

    return this.createNoteEmployee(reportId, dto, user.sub);
  }

  private async createNoteEmployee(
    reportId: string,
    dto: CreateNoteDto,
    userId: string,
  ): Promise<NotePublic> {
    // Employee must be assigned
    const assigned = await this.assignmentsService.isAssigned(reportId, userId);
    if (!assigned) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không được gán vào báo cáo này' });
    }

    let threadOwnerId = userId;
    let parentId: string | null = null;

    if (dto.parentId) {
      // Employee can reply within their OWN thread
      const parent = await this.repo.findActiveById(dto.parentId);
      if (!parent) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note cha không tồn tại' });
      }

      // Block level-3 FIRST (checked before thread ownership so any user gets 400 not 403)
      if (parent.parent_id !== null) {
        throw new BadRequestException({
          code: 'NESTING_TOO_DEEP',
          message: 'Không thể reply sâu hơn cấp 2',
        });
      }

      // Parent must belong to the employee's own thread
      if (parent.thread_owner_id !== userId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn chỉ có thể reply trong thread của chính mình' });
      }

      parentId = dto.parentId;
      threadOwnerId = parent.thread_owner_id;
    }

    return this.repo.create({
      reportId,
      threadOwnerId,
      authorId: userId,
      parentId,
      content: dto.content,
    });
  }

  private async createNoteCeo(
    reportId: string,
    dto: CreateNoteDto,
    ceoId: string,
  ): Promise<NotePublic> {
    if (!dto.parentId) {
      // CEO cannot create root notes — must reply into an employee thread
      throw new BadRequestException({
        code: 'CEO_MUST_REPLY',
        message: 'CEO phải reply vào thread của nhân viên (cần parentId)',
      });
    }

    const parent = await this.repo.findActiveById(dto.parentId);
    if (!parent) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note cha không tồn tại' });
    }

    // Block level-3: parent must be a root note
    if (parent.parent_id !== null) {
      throw new BadRequestException({
        code: 'NESTING_TOO_DEEP',
        message: 'Không thể reply sâu hơn cấp 2',
      });
    }

    // thread_owner_id inherits from parent's thread
    return this.repo.create({
      reportId,
      threadOwnerId: parent.thread_owner_id,
      authorId: ceoId,
      parentId: dto.parentId,
      content: dto.content,
    });
  }

  // ─── PUT /api/notes/:noteId ──────────────────────────────────────────────────

  async updateNote(
    noteId: string,
    dto: UpdateNoteDto,
    user: JwtPayload,
  ): Promise<NotePublic> {
    const note = await this.repo.findActiveById(noteId);
    if (!note) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note không tồn tại' });
    }

    // Only the author can edit their own note
    if (note.author_id !== user.sub) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không thể sửa note của người khác' });
    }

    const updated = await this.repo.update(noteId, dto.content);
    if (!updated) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note không tồn tại' });
    }
    return updated;
  }

  // ─── DELETE /api/notes/:noteId ───────────────────────────────────────────────

  async deleteNote(noteId: string, user: JwtPayload): Promise<{ message: string }> {
    const note = await this.repo.findActiveById(noteId);
    if (!note) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note không tồn tại' });
    }

    // Author can delete own note; super_admin can delete any note
    if (user.role !== 'super_admin' && note.author_id !== user.sub) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không thể xóa note này' });
    }

    await this.repo.softDelete(noteId);
    return { message: 'Xóa note thành công' };
  }
}
