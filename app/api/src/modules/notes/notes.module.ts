import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";
import { NotesRepository } from "./notes.repository";
import { AuthModule } from "../auth/auth.module";
import { AssignmentsModule } from "../assignments/assignments.module";

@Module({
  imports: [
    AuthModule, // provides JwtGuard / JwtService
    AssignmentsModule, // exports AssignmentsService for assignment checks
  ],
  controllers: [NotesController],
  providers: [NotesService, NotesRepository],
})
export class NotesModule {}
