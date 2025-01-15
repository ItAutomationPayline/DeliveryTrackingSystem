import { Component } from '@angular/core';
import nodemailer from 'nodemailer';

@Component({
  selector: 'app-email-sender',
  standalone: false,
  
  templateUrl: './email-sender.component.html',
  styleUrl: './email-sender.component.css'
})
export class EmailSenderComponent {
  
  //  public transporter: nodemailer.Transporter;
  // constructor() {
  //   // Configure the SMTP transporter
  //   this.transporter = nodemailer.createTransport({
  //     service: 'smtp.gmail.com', // Use Gmail's SMTP service
  //     auth: {
  //       user: 'donotreplyservice.trial@gmail.com', // Your Gmail address
  //       pass: 'sepw vpre vcdb usal', // App password (not your Gmail password)
  //     },
  //   });
  // }

  // Method to send an email
//   async sendEmail(options: EmailOptions): Promise<void> {
//     try {
//       const info = await this.transporter.sendMail({
//         from: '"Your Name" <your-email@gmail.com>', // Sender details
//         to: options.to, // Recipient(s)
//         subject: options.subject, // Subject
//         text: options.text, // Plain text body
//         html: options.html, // HTML body (optional)
//       });

//       console.log('Email sent:', info.messageId);
//     } catch (error) {
//       console.error('Error sending email:', error);
//     }
// }
}

