import { Injectable, OnModuleInit } from '@nestjs/common';
import { DepartmentService } from 'src/modules/department/department.service'; // Import the DepartmentService
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
    constructor(
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
    ) {}

    async onModuleInit() {
        await this.seedDepartment();
        await this.seedUser();
    }

    async seedDepartment() {
        const newDepartment = { name: 'Diretoria' };

        const existingDepartment = await this.departmentService.findByName(newDepartment.name);

        let department;
        if (!existingDepartment) {
            console.log("Entrou", existingDepartment)
            department = await this.departmentService.create(newDepartment);
        } else {
            department = existingDepartment;
        }

        return department;
    }

    async seedUser() {
        const department = await this.seedDepartment();

        const newUser = {
            firstName: 'Isaac',
            lastName: 'Silva',
            email: 'isaacensilva@gmail.com',
            password: 'Admin1234',
            isAdmin: true,
            departmentId: department.id,
        };

        const existingUser = await this.userService.findByEmail(newUser.email);

        if (!existingUser) {
            await this.userService.create(newUser);
        }
    }
}
