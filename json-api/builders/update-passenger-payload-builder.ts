/**
 * Single file for the updatePassenger feature.
 *
 * UpdatePassengerActionBuilder  — builds one action (all update fields default to null).
 * UpdatePassengerPayloadBuilder — builds the full request payload wrapping the actions.
 *
 * Usage — delete document:
 *   new UpdatePassengerPayloadBuilder()
 *     .withOrderId('JU1152I1Y70ZH')
 *     .withAction(new UpdatePassengerActionBuilder('PAX4', '4').withDeleteDocument('PAX4_Identity_1').build())
 *     .build();
 *
 * Usage — update email:
 *   new UpdatePassengerPayloadBuilder()
 *     .withOrderId('JU115IO4G3IFL')
 *     .withAction(new UpdatePassengerActionBuilder('PAX3', '3').withUpdateEmail('PAX3_EmailAddress_1', 'OWOZGFHJ@sabre.com', 'EMAIL_PURPOSE_CONTACT_TRACING').build())
 *     .build();
 *
 * Usage — multiple actions in one request:
 *   new UpdatePassengerPayloadBuilder()
 *     .withOrderId('JU1152I1Y70ZH')
 *     .withAction(new UpdatePassengerActionBuilder('PAX1', '1').withDeleteDocument('PAX1_Identity_1').build())
 *     .withAction(new UpdatePassengerActionBuilder('PAX2', '2').withUpdateEmail('PAX2_Email_1', 'new@example.com').build())
 *     .build();
 */

export class UpdatePassengerActionBuilder {
  private readonly passengerId: string;
  private readonly actionId: string;

  private updateEmail: object | null = null;
  private updateDocument: object | null = null;
  private updatePhone: object | null = null;
  private updateAddress: object | null = null;
  private updateEmergencyContact: object | null = null;

  constructor(passengerId: string, actionId: string) {
    this.passengerId = passengerId;
    this.actionId = actionId;
  }

  // ─── Email ───────────────────────────────────────────────────────────────

  withUpdateEmail(emailId: string, email: string, purposeCode: string = 'EMAIL_PURPOSE_GENERAL'): this {
    this.updateEmail = {
      emailAddress: { purposeCodes: [purposeCode], label: 'EmailAddress', id: emailId, email },
      updateType: 'UPDATE_TYPE_UPDATE'
    };
    return this;
  }

  withDeleteEmail(emailId: string): this {
    this.updateEmail = {
      emailAddress: { id: emailId },
      updateType: 'UPDATE_TYPE_DELETE'
    };
    return this;
  }

  // ─── Document ────────────────────────────────────────────────────────────

  withDeleteDocument(documentId: string): this {
    this.updateDocument = {
      identityDocument: { id: documentId },
      updateType: 'UPDATE_TYPE_DELETE'
    };
    return this;
  }

  withUpdateDocument(documentId: string, documentFields: object): this {
    this.updateDocument = {
      identityDocument: { id: documentId, ...documentFields },
      updateType: 'UPDATE_TYPE_UPDATE'
    };
    return this;
  }

  // ─── Phone ───────────────────────────────────────────────────────────────

  withUpdatePhone(phoneId: string, localNumber: string, purposeCode: string = 'PHONE_PURPOSE_HOME', countryCallingCode: string = '1'): this {
    this.updatePhone = {
      phoneNumber: {
        purposeCodes: [purposeCode],
        label: 'HomePhone',
        id: phoneId,
        structured: { countryCallingCode, localNumber }
      },
      updateType: 'UPDATE_TYPE_UPDATE'
    };
    return this;
  }

  withDeletePhone(phoneId: string): this {
    this.updatePhone = {
      phoneNumber: { id: phoneId },
      updateType: 'UPDATE_TYPE_DELETE'
    };
    return this;
  }

  // ─── Address ─────────────────────────────────────────────────────────────

  withUpdateAddress(addressId: string, addressLine1: string, city: string, postalCode: string, countryCode: string): this {
    this.updateAddress = {
      address: { id: addressId, addressLine1, city, postalCode, countryCode },
      updateType: 'UPDATE_TYPE_UPDATE'
    };
    return this;
  }

  withDeleteAddress(addressId: string): this {
    this.updateAddress = {
      address: { id: addressId },
      updateType: 'UPDATE_TYPE_DELETE'
    };
    return this;
  }

  // ─── Emergency Contact ───────────────────────────────────────────────────

  withUpdateEmergencyContact(name: string, phone: string): this {
    this.updateEmergencyContact = {
      emergencyContact: { name, phone },
      updateType: 'UPDATE_TYPE_UPDATE'
    };
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    return {
      id: this.actionId,
      updatePassenger: {
        passengerId: this.passengerId,
        updateEmail: this.updateEmail,
        updateDocument: this.updateDocument,
        updatePhone: this.updatePhone,
        updateAddress: this.updateAddress,
        updateEmergencyContact: this.updateEmergencyContact
      }
    };
  }
}

export class UpdatePassengerPayloadBuilder {
  private orderId: string = '';
  private actions: object[] = [];
  private channel: string = 'STANDARD';

  withOrderId(orderId: string): this {
    this.orderId = orderId;
    return this;
  }

  withChannel(channel: string): this {
    this.channel = channel;
    return this;
  }

  withAction(action: object): this {
    this.actions.push(action);
    return this;
  }

  build(): object {
    return {
      pointOfSale: { channel: this.channel },
      orderId: this.orderId,
      actions: this.actions
    };
  }
}
