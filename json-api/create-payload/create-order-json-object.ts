import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);
import { faker } from '@faker-js/faker';

export class CreateOrderJsonObject {
  origin: string;
  destination: string;
  day: number;
  month: number;
  year: number;
  currency: string;

  constructor() {

  }

  public getCreateOrderPayload(passengerDetailsMap: Map<string, Map<string, string>>, offerId: string): string {
    const offerItemIds: string[] = [];

    let totalAmount = 0;

    passengerDetailsMap.forEach((detailsMap, paxId) => {
      const offerItemId = detailsMap.get('offerItemId') || '';
      const priceStr = detailsMap.get('price') || '0';

      offerItemIds.push(offerItemId);
      totalAmount += parseFloat(priceStr);
    });

    const payload = {
      point_of_sale: {
        channel: 'STANDARD',
        country: {
          code: 'AU'
        },
        city: {
          code: 'SYD'
        }
      },
      acceptOffers: [
        {
          offerId,
          offerItems: offerItemIds.map(id => ({ offerItemId: id }))
        }
      ],
      paymentFunctions: [
        {
          offerAssociations: [
            {
              offerId,
              offerItemIds: [offerItemIds]
            }
          ],
          paymentProcessingSummary: {
            paymentMethod: 'PAYMENT_METHOD_PAYMENT_CARD',
            typeCodeIata: 'CC',
            amount: {
              currency: 'AUD',
              amount: totalAmount.toFixed(2) // ✅ dynamically calculated total
            },
            payerInfo: {
              title: 'Mr.',
              givenName: 'John',
              surname: 'Doe',
              dateOfBirth: {
                year: 1989,
                month: 1,
                day: 11
              },
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
                cardHolderName: {
                  fullName: 'John Doe'
                },
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
        }
      ],
      passengers: this.getPassengers(passengerDetailsMap) // Must also support Map<string, Map<string, string>>
    };

    logger.info('Create order payload:', JSON.stringify(payload));
    return JSON.stringify(payload);
  }


  private getPassengers(passengerDetailsMap: Map<string, Map<string, string>>): any[] {
    const passengers: any[] = [];
    let year: number;

    passengerDetailsMap.forEach((infoMap, paxId) => {
      const firstName: string = faker.person.firstName();
      const lastName: string = faker.person.lastName();
      const middleName: string = faker.person.middleName();
      const email: string = `${firstName}.${lastName}@sabre.com`;

      // Extract paxTypeCode from the infoMap, fallback to 'ADT' if missing
      const paxTypeCode = infoMap.get('paxTypeCode') ?? 'ADT';

      if (paxTypeCode.match(/CNN/)) {
        year = 2018;
      } else {
        year = 1999;
      }

      passengers.push({
        id: paxId,
        passengerTypeCode: paxTypeCode,
        person: {
          title: 'Mrs',
          givenName: firstName,
          middleName: middleName,
          surname: lastName,
          dateOfBirth: {
            year: year,
            month: 4,
            day: 3
          },
          gender: 'GENDER_FEMALE',
          emailAddresses: [
            {
              label: 'EmailAddress',
              purposeCodes: ['EMAIL_PURPOSE_GENERAL'],
              email: email
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
        isPrimaryPassenger: paxId === 'PAX1', // ✅ Optional: mark PAX1 as primary
        preferredCommunicationMethod: 'PREFERRED_COMMUNICATION_METHOD_SMS'
      });
    });

    return passengers;
  }
}
