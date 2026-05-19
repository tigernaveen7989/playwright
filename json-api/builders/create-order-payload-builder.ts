/**
 * Builds the create order request payload.
 *
 * Usage:
 *   new CreateOrderPayloadBuilder()
 *     .withOfferId(offerId)
 *     .withPassengerDetails(passengerDetailsMap)
 *     .build();
 */
import { faker } from '@faker-js/faker';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class CreateOrderPayloadBuilder {
  private passengerDetailsMap: Map<string, Map<string, string>> = new Map();
  private offerId: string = '';

  // ─── Offer ───────────────────────────────────────────────────────────────

  withOfferId(offerId: string): this {
    this.offerId = offerId;
    return this;
  }

  // ─── Passengers ──────────────────────────────────────────────────────────

  withPassengerDetails(passengerDetailsMap: Map<string, Map<string, string>>): this {
    this.passengerDetailsMap = passengerDetailsMap;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    const offerItemIds: string[] = [];
    let totalAmount = 0;

    this.passengerDetailsMap.forEach((detailsMap) => {
      offerItemIds.push(detailsMap.get('offerItemId') || '');
      totalAmount += parseFloat(detailsMap.get('price') || '0');
    });

    const payload = {
      point_of_sale: {
        channel: 'STANDARD',
        country: { code: 'AU' },
        city: { code: 'SYD' }
      },
      acceptOffers: [
        {
          offerId: this.offerId,
          offerItems: offerItemIds.map(id => ({ offerItemId: id }))
        }
      ],
      paymentFunctions: [this.buildPaymentFunction(offerItemIds, totalAmount)],
      passengers: this.buildPassengers()
    };
    logger.info('Create order payload:', JSON.stringify(payload));
    return payload;
  }

  // ─── Payment ─────────────────────────────────────────────────────────────

  private buildPaymentFunction(offerItemIds: string[], totalAmount: number): object {
    return {
      offerAssociations: [
        {
          offerId: this.offerId,
          offerItemIds: [offerItemIds]
        }
      ],
      paymentProcessingSummary: {
        paymentMethod: 'PAYMENT_METHOD_PAYMENT_CARD',
        typeCodeIata: 'CC',
        amount: {
          currency: 'AUD',
          amount: totalAmount.toFixed(2)
        },
        payerInfo: {
          title: 'Mr.',
          givenName: 'John',
          surname: 'Doe',
          dateOfBirth: { year: 1989, month: 1, day: 11 },
          gender: 'GENDER_MALE',
          emailAddresses: [
            {
              label: 'EmailAddress',
              purposeCodes: ['EMAIL_PURPOSE_GENERAL'],
              email: 'john.smith@example.com'
            }
          ],
          phoneNumbers: [
            {
              label: 'HomePhone',
              purposeCodes: ['PHONE_PURPOSE_HOME'],
              structured: {
                countryCallingCode: '1',
                areaCode: '001',
                localNumber: '1234567',
                extension: '1234'
              }
            }
          ],
          addresses: [
            {
              label: 'homePostalAddress',
              purposeCodes: ['ADDRESS_PURPOSE_HOME_ADDRESS'],
              addressLine1: 'Baker Street 23/14',
              city: 'Warsaw',
              postalCode: '32-100',
              countryCode: 'PL'
            },
            {
              label: 'destinationPostalAddress',
              purposeCodes: ['ADDRESS_PURPOSE_DESTINATION_ADDRESS'],
              addressLine1: '12, Main road',
              addressLine2: 'apt 123',
              city: 'New York',
              stateProvinceCode: 'NJ',
              postalCode: '111-1234',
              countryCode: 'US'
            }
          ]
        },
        paymentMethodDetails: {
          paymentCard: {
            cardHolderName: { fullName: 'John Doe' },
            billingAddress: {
              label: 'homePostalAddress',
              purposeCodes: ['ADDRESS_PURPOSE_HOME_ADDRESS'],
              addressLine1: 'Baker Street 23',
              addressLine2: 'Apartment 14',
              city: 'Warsaw',
              stateProvinceCode: 'TX',
              postalCode: '32-100',
              countryCode: 'PL',
              postOfficeBoxCode: 'PO Box'
            },
            tokenizedCardId: '5123P10JZCC02346',
            securityCode: '123',
            cardVendorCode: 'CA',
            expirationDate: '1229'
          }
        }
      }
    };
  }

  // ─── Passengers ──────────────────────────────────────────────────────────

  private buildPassengers(): any[] {
    const passengers: any[] = [];

    this.passengerDetailsMap.forEach((infoMap, paxId) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const middleName = faker.person.middleName();
      const email = `${firstName}.${lastName}@sabre.com`;
      const paxTypeCode = infoMap.get('paxTypeCode') ?? 'ADT';
      const birthYear = paxTypeCode.match(/CNN/) ? 2018 : 1999;

      passengers.push({
        id: paxId,
        passengerTypeCode: paxTypeCode,
        person: {
          title: 'Mrs',
          givenName: firstName,
          middleName,
          surname: lastName,
          dateOfBirth: { year: birthYear, month: 4, day: 3 },
          gender: 'GENDER_FEMALE',
          emailAddresses: [
            {
              label: 'EmailAddress',
              purposeCodes: ['EMAIL_PURPOSE_GENERAL'],
              email
            }
          ],
          phoneNumbers: [
            {
              label: 'HomePhone',
              purposeCodes: ['PHONE_PURPOSE_HOME'],
              structured: {
                countryCallingCode: '1',
                areaCode: '907',
                localNumber: '123456789',
                extension: '012'
              }
            }
          ],
          addresses: [
            {
              label: 'homePostalAddress',
              purposeCodes: ['ADDRESS_PURPOSE_HOME_ADDRESS'],
              addressLine1: 'Baker Street 23/14',
              city: 'Warsaw',
              postalCode: '32-100',
              countryCode: 'PL'
            },
            {
              label: 'destinationPostalAddress',
              purposeCodes: ['ADDRESS_PURPOSE_DESTINATION_ADDRESS'],
              addressLine1: '12, Main road',
              addressLine2: 'apt 123',
              city: 'New York',
              stateProvinceCode: 'NJ',
              postalCode: '111-1234',
              countryCode: 'US'
            }
          ]
        },
        identityDocuments: [],
        isPrimaryPassenger: paxId === 'PAX1',
        preferredCommunicationMethod: 'PREFERRED_COMMUNICATION_METHOD_SMS'
      });
    });

    return passengers;
  }
}
