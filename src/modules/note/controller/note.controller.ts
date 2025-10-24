import {Body, Controller, Get, Param, Patch, Post} from '@nestjs/common';
import { NoteService } from '../service/note.service';
import { NoteDto } from '../dto/note.dto';

@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get(':id')
  getNoteByCourseValueId(@Param('id') id: number) {
    return this.noteService.getNoteByCourseValueId(id);
  }

  // @Post('create')
  // createNote(@Body() noteDto: NoteDto) {
  //   return this.noteService.createNote(noteDto);
  // }

  @Patch('update')
  updateNote(@Body() noteDto: NoteDto) {
    return this.noteService.updateNote(noteDto);
  }
}
